import uuid
import sqlalchemy as sa
from ..database import db, JSONBType


class AccessAuditLog(db.Model):
    """
    Immutable compliance audit record tracking all ABAC authorization evaluations,
    access requests, matched policies, and environmental snapshots.
    """
    __tablename__ = 'access_audit_logs'

    id = sa.Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id = sa.Column(sa.String(64), nullable=False, index=True)
    
    subject_identifier = sa.Column(sa.String(150), nullable=False, index=True)
    resource_key = sa.Column(sa.String(150), nullable=False, index=True)
    action = sa.Column(sa.String(64), nullable=False, index=True)
    decision = sa.Column(sa.String(16), nullable=False, index=True)  # 'PERMIT' or 'DENY'
    
    # List of policy codes that evaluated to this decision
    matched_policy_ids = sa.Column(JSONBType, nullable=True, default=list)
    
    # Snapshot of attributes at time of request (subject, resource, environment)
    context_snapshot = sa.Column(JSONBType, nullable=True, default=dict)
    
    evaluation_duration_ms = sa.Column(sa.Float, nullable=True)
    client_ip = sa.Column(sa.String(64), nullable=True)
    
    timestamp = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
        index=True
    )

    __table_args__ = (
        sa.Index('ix_audit_subject_timestamp', 'subject_identifier', 'timestamp'),
        sa.Index('ix_audit_resource_timestamp', 'resource_key', 'timestamp'),
        sa.Index('ix_audit_decision_timestamp', 'decision', 'timestamp'),
        sa.CheckConstraint("decision IN ('PERMIT', 'DENY')", name='chk_audit_decision'),
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'request_id': self.request_id,
            'subject_identifier': self.subject_identifier,
            'resource_key': self.resource_key,
            'action': self.action,
            'decision': self.decision,
            'matched_policy_ids': self.matched_policy_ids or [],
            'context_snapshot': self.context_snapshot or {},
            'evaluation_duration_ms': self.evaluation_duration_ms,
            'client_ip': self.client_ip,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }
