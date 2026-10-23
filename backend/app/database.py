import time
import logging
from flask import current_app, has_app_context
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB

logger = logging.getLogger(__name__)

# Core database and migration instances
db = SQLAlchemy()
migrate = Migrate()

# Portable JSONB type: native JSONB on PostgreSQL / Supabase, falls back to standard JSON on SQLite
JSONBType = JSONB().with_variant(sa.JSON(), 'sqlite')


def check_database_connectivity(engine=None, timeout_seconds=3.0) -> dict:
    """
    Safely tests database connectivity with a lightweight query.
    
    Security & Privacy guarantees:
    - Never exposes passwords, hostnames, usernames, or database URLs in return payloads.
    - Raw driver exceptions are logged internally at WARNING level with sensitive details redacted.
    - Timeout is bounded to prevent hanging health checks.
    """
    # Check if inside app context and if database URI is configured
    if engine is None and has_app_context():
        db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI')
        if not db_uri:
            return {
                'configured': False,
                'status': 'not_configured',
                'connected': False,
                'message': 'Database URL not configured in environment',
            }

    if engine is None:
        try:
            engine = db.engine
        except Exception:
            return {
                'configured': False,
                'status': 'not_configured',
                'connected': False,
                'message': 'Database engine is not initialized',
            }

    if not engine or not str(engine.url):
        return {
            'configured': False,
            'status': 'not_configured',
            'connected': False,
            'message': 'Database URL not configured in environment',
        }

    dialect = engine.dialect.name
    password = engine.url.password or ''
    host = engine.url.host or ''

    # Detect placeholder password without attempting failing auth requests
    if '[YOUR-PASSWORD]' in password or '[YOUR-PROJECT-REF]' in host or '[YOUR-PASSWORD]' in str(engine.url):
        return {
            'configured': True,
            'status': 'unverified_placeholder',
            'connected': False,
            'dialect': dialect,
            'message': 'Database URL contains placeholder credentials. Replace [YOUR-PASSWORD] in backend/.env with your actual Supabase database password.',
        }

    start_time = time.perf_counter()

    try:
        # Establish connection and execute simple query with timeout
        # Never disables TLS/SSL verification
        with engine.connect() as conn:
            if dialect == 'postgresql':
                timeout_ms = int(timeout_seconds * 1000)
                conn.execute(text(f"SET LOCAL statement_timeout = '{timeout_ms}ms'"))
            conn.execute(text("SELECT 1"))
        
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            'configured': True,
            'status': 'connected',
            'connected': True,
            'dialect': dialect,
            'latency_ms': latency_ms,
            'message': 'Database connection verified',
        }
    except Exception as exc:
        # Redacted internal logging
        logger.warning("Database health check failed: %s", exc.__class__.__name__)
        return {
            'configured': True,
            'status': 'connection_failed',
            'connected': False,
            'dialect': dialect,
            'error': 'Unable to establish database connection',
        }
