"""
ABAC Enterprise Engine - Local SQLite Audit Fallback Service.
Provides persistent, resilient local audit logging when Oracle ORDS audit ingestion is unavailable.
Utilizes the existing AccessAuditLog SQLAlchemy model.
"""

import os
import re
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker
from flask import current_app, has_app_context

from ..models.audit import AccessAuditLog

logger = logging.getLogger(__name__)

# Sensitive terms to redact from error logs
REDACTED_TERMS = {
    'password', 'password_hash', 'secret', 'client_secret', 'token',
    'access_token', 'refresh_token', 'authorization', 'bearer', 'api_key'
}


class AuditFallbackStore:
    """
    Persistent SQLite storage store for ABAC evaluation audit records.
    Safely initializes tables, guarantees idempotency, and preserves records across server restarts.
    """

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            if has_app_context():
                db_path = current_app.config.get('AUDIT_FALLBACK_DB_PATH')
            if not db_path:
                backend_dir = Path(__file__).resolve().parent.parent.parent
                db_path = str(backend_dir / 'data' / 'audit_fallback.db')

        self.db_path = db_path

        # If file-based SQLite, ensure parent directory exists
        if self.db_path != ':memory:' and not self.db_path.startswith('sqlite:///:memory:'):
            parent_dir = os.path.dirname(os.path.abspath(self.db_path))
            os.makedirs(parent_dir, exist_ok=True)

        sqlite_url = f"sqlite:///{self.db_path}" if not self.db_path.startswith('sqlite:///') else self.db_path

        # SQLite engine configuration with thread safety
        engine_kwargs = {
            'connect_args': {'check_same_thread': False},
        }
        if ':memory:' in sqlite_url:
            engine_kwargs['poolclass'] = sa.pool.StaticPool

        self.engine = sa.create_engine(sqlite_url, **engine_kwargs)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)

        # Initialize schema safely using existing AccessAuditLog model table
        self._init_schema()

    def _init_schema(self) -> None:
        """Initializes access_audit_logs table if not already created."""
        try:
            AccessAuditLog.__table__.create(bind=self.engine, checkfirst=True)
            logger.info("Local SQLite audit fallback store initialized at: %s", self.db_path)
        except Exception as exc:
            logger.warning("Failed to initialize SQLite audit schema: %s", self._sanitize_str(str(exc)))

    def save_audit_log(self, audit_entry: Dict[str, Any]) -> bool:
        """
        Idempotently inserts and commits an audit log entry into local SQLite storage.
        Returns True on successful commit or if entry already exists.
        Returns False on failure without crashing evaluation.
        """
        session = self.Session()
        try:
            entry_id = audit_entry.get('id')
            req_id = audit_entry.get('request_id')

            # Idempotency check: if entry with same id or request_id already exists, skip duplicate insertion
            if entry_id or req_id:
                query = session.query(AccessAuditLog)
                if entry_id and req_id:
                    query = query.filter((AccessAuditLog.id == entry_id) | (AccessAuditLog.request_id == req_id))
                elif entry_id:
                    query = query.filter(AccessAuditLog.id == entry_id)
                else:
                    query = query.filter(AccessAuditLog.request_id == req_id)

                existing = query.first()
                if existing:
                    logger.debug("Audit entry already exists locally (id=%s, req_id=%s)", entry_id, req_id)
                    return True

            # Prepare context snapshot and matched policies safely
            matched_policies = audit_entry.get('matched_policy_ids') or []
            if not isinstance(matched_policies, list):
                matched_policies = list(matched_policies)

            context_snapshot = audit_entry.get('context_snapshot') or {}
            if not isinstance(context_snapshot, dict):
                context_snapshot = dict(context_snapshot)

            duration = audit_entry.get('evaluation_duration_ms')
            if duration is not None:
                try:
                    duration = float(duration)
                except (ValueError, TypeError):
                    duration = 0.0

            log_record = AccessAuditLog(
                id=entry_id or str(uuid.uuid4()),
                request_id=req_id or str(uuid.uuid4()),
                subject_identifier=str(audit_entry.get('subject_identifier', 'unknown')),
                resource_key=str(audit_entry.get('resource_key', 'unknown')),
                action=str(audit_entry.get('action', 'UNKNOWN')).upper(),
                decision=str(audit_entry.get('decision', 'DENY')).upper(),
                matched_policy_ids=matched_policies,
                context_snapshot=context_snapshot,
                evaluation_duration_ms=duration,
                client_ip=str(audit_entry.get('client_ip', '') or ''),
                timestamp=datetime.now(timezone.utc),
            )

            session.add(log_record)
            session.commit()
            return True

        except Exception as exc:
            session.rollback()
            logger.warning("Failed to commit audit record to local SQLite: %s", self._sanitize_str(str(exc)))
            return False
        finally:
            session.close()

    def get_audit_logs(
        self,
        subject: Optional[str] = None,
        resource_key: Optional[str] = None,
        decision: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Queries audit log records from local SQLite storage."""
        session = self.Session()
        try:
            q = session.query(AccessAuditLog)
            if subject:
                q = q.filter(AccessAuditLog.subject_identifier == subject)
            if resource_key:
                q = q.filter(AccessAuditLog.resource_key == resource_key)
            if decision:
                q = q.filter(AccessAuditLog.decision == decision.upper())

            q = q.order_by(AccessAuditLog.timestamp.desc()).limit(limit)
            records = q.all()
            return [r.to_dict() for r in records]
        except Exception as exc:
            logger.warning("Failed to query local audit logs: %s", self._sanitize_str(str(exc)))
            return []
        finally:
            session.close()

    def count_audit_logs(self) -> int:
        """Returns the total number of records stored locally."""
        session = self.Session()
        try:
            return session.query(AccessAuditLog).count()
        except Exception as exc:
            logger.warning("Failed to count local audit logs: %s", self._sanitize_str(str(exc)))
            return 0
        finally:
            session.close()

    def close(self) -> None:
        """Disposes the database engine pool cleanly."""
        if hasattr(self, 'engine') and self.engine:
            self.engine.dispose()

    @staticmethod
    def _sanitize_str(val: str) -> str:
        """Redacts potential secrets or credentials from log strings."""
        sanitized = re.sub(
            r'(?i)("?(?:password|client_secret|access_token|refresh_token|bearer|authorization|token|secret)"?\s*[:=]\s*"?)[^",\s}]+("?)',
            r'\1[REDACTED]\2',
            val
        )
        return sanitized


_fallback_store_instance: Optional[AuditFallbackStore] = None


def get_audit_fallback_store(db_path: Optional[str] = None) -> AuditFallbackStore:
    """Factory helper to obtain or initialize the AuditFallbackStore singleton."""
    global _fallback_store_instance
    if db_path is not None:
        return AuditFallbackStore(db_path=db_path)

    if has_app_context():
        store = current_app.extensions.get('audit_fallback_store') if hasattr(current_app, 'extensions') else None
        if store is None:
            config_path = current_app.config.get('AUDIT_FALLBACK_DB_PATH')
            store = AuditFallbackStore(db_path=config_path)
            if hasattr(current_app, 'extensions'):
                current_app.extensions['audit_fallback_store'] = store
        return store

    if _fallback_store_instance is None:
        _fallback_store_instance = AuditFallbackStore()
    return _fallback_store_instance
