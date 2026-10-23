import uuid
import sqlalchemy as sa
from ..database import db, JSONBType


class Policy(db.Model):
    """
    Attribute-Based Access Control (ABAC) Policy Model.
    Supports structured multi-dimensional evaluation conditions (Subject, Resource, Environment)
    stored as PostgreSQL JSONB with SQLite fallback for portability.
    """
    __tablename__ = 'policies'

    id = sa.Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = sa.Column(sa.String(64), unique=True, nullable=False, index=True)
    name = sa.Column(sa.String(200), nullable=False)
    description = sa.Column(sa.Text, nullable=True)
    
    category = sa.Column(sa.String(64), nullable=False, index=True)
    priority = sa.Column(sa.Integer, default=10, nullable=False, index=True)
    effect = sa.Column(sa.String(16), nullable=False, index=True)  # 'PERMIT' or 'DENY'
    is_enabled = sa.Column(sa.Boolean, default=True, nullable=False, index=True)
    
    # Target Actions (e.g., ['READ', 'EXPORT', 'UPDATE', 'DELETE'])
    actions = sa.Column(JSONBType, nullable=False, default=list)
    
    # Structured Condition Vector: subject, resource, and environment rules
    # Example:
    # {
    #   "subject": { "role": ["SecOps"], "clearanceLevel": "Level 3+", "mfaEnforced": true },
    #   "resource": { "classification": "Confidential", "type": "Customer_PII_Vault" },
    #   "environment": { "ipRange": "10.240.0.0/16", "allowedHours": "08:00 - 19:00 UTC" }
    # }
    conditions = sa.Column(JSONBType, nullable=False, default=dict)
    
    version = sa.Column(sa.String(32), default='1.0.0', nullable=False)
    
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False
    )

    __table_args__ = (
        sa.Index('ix_policies_category_enabled', 'category', 'is_enabled'),
        sa.Index('ix_policies_effect_enabled', 'effect', 'is_enabled'),
        sa.CheckConstraint("effect IN ('PERMIT', 'DENY')", name='chk_policy_effect'),
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'effect': self.effect,
            'is_enabled': self.is_enabled,
            'actions': self.actions or [],
            'conditions': self.conditions or {},
            'version': self.version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
