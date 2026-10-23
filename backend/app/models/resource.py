import uuid
import sqlalchemy as sa
from sqlalchemy.orm import relationship
from ..database import db


class ProtectedResource(db.Model):
    """
    Protected enterprise resources (e.g., databases, API endpoints, microservices, cloud buckets).
    Includes classification level and department ownership for ABAC validation.
    """
    __tablename__ = 'protected_resources'

    id = sa.Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_key = sa.Column(sa.String(120), unique=True, nullable=False, index=True)
    name = sa.Column(sa.String(150), nullable=False)
    description = sa.Column(sa.Text, nullable=True)
    
    resource_type = sa.Column(sa.String(64), nullable=False, index=True)
    classification = sa.Column(sa.String(32), nullable=False, index=True)
    owner_department = sa.Column(sa.String(100), nullable=True, index=True)
    
    owner_id = sa.Column(
        sa.String(36),
        sa.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
        index=True
    )
    
    is_active = sa.Column(sa.Boolean, default=True, nullable=False, index=True)
    
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False
    )

    # Relationships
    owner = relationship('User', foreign_keys=[owner_id])
    attributes = relationship(
        'ResourceAttribute',
        back_populates='resource',
        cascade='all, delete-orphan',
        lazy='selectin'
    )

    def to_dict(self, include_attributes: bool = False) -> dict:
        data = {
            'id': self.id,
            'resource_key': self.resource_key,
            'name': self.name,
            'description': self.description,
            'resource_type': self.resource_type,
            'classification': self.classification,
            'owner_department': self.owner_department,
            'owner_id': self.owner_id,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_attributes and self.attributes:
            data['attributes'] = {
                attr.attribute_name: attr.get_typed_value()
                for attr in self.attributes
            }
        return data


class ResourceAttribute(db.Model):
    """
    Resource-specific attributes (e.g. data_sensitivity, encryption_status, compliance_frameworks).
    """
    __tablename__ = 'resource_attributes'

    id = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    resource_id = sa.Column(
        sa.String(36),
        sa.ForeignKey('protected_resources.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    attribute_name = sa.Column(sa.String(100), nullable=False, index=True)
    attribute_value = sa.Column(sa.Text, nullable=False)
    data_type = sa.Column(sa.String(32), default='string', nullable=False)
    
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False
    )

    # Relationships
    resource = relationship('ProtectedResource', back_populates='attributes')

    __table_args__ = (
        sa.UniqueConstraint('resource_id', 'attribute_name', name='uq_resource_attribute_name'),
    )

    def get_typed_value(self):
        if self.data_type == 'integer':
            try:
                return int(self.attribute_value)
            except ValueError:
                return self.attribute_value
        elif self.data_type == 'boolean':
            return self.attribute_value.lower() in ('true', '1', 'yes')
        return self.attribute_value
