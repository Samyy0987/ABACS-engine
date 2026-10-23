import uuid
import sqlalchemy as sa
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash
from ..database import db


class User(db.Model):
    """
    User account model with authentication status and subject attributes.
    Plaintext passwords are NEVER stored; passwords are salted & hashed using Werkzeug.
    """
    __tablename__ = 'users'

    id = sa.Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = sa.Column(sa.String(64), unique=True, nullable=False, index=True)
    email = sa.Column(sa.String(255), unique=True, nullable=False, index=True)
    password_hash = sa.Column(sa.String(255), nullable=False)
    
    is_active = sa.Column(sa.Boolean, default=True, nullable=False, index=True)
    is_verified = sa.Column(sa.Boolean, default=False, nullable=False)
    
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False
    )

    # Relationships
    attributes = relationship(
        'UserAttribute',
        back_populates='user',
        cascade='all, delete-orphan',
        lazy='selectin'
    )

    def set_password(self, password: str) -> None:
        """Hashes plaintext password with a secure cryptographic salt."""
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verifies password against stored cryptographic hash."""
        if not self.password_hash or not password:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_attributes: bool = False) -> dict:
        """Returns safe user representation without exposing password hash."""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_attributes and self.attributes:
            data['attributes'] = {
                attr.attribute_name: attr.get_typed_value()
                for attr in self.attributes
            }
        return data


class UserAttribute(db.Model):
    """
    Subject attributes for ABAC evaluation (e.g., department, clearance_level, role, mfa_enforced).
    """
    __tablename__ = 'user_attributes'

    id = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    user_id = sa.Column(
        sa.String(36),
        sa.ForeignKey('users.id', ondelete='CASCADE'),
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
    user = relationship('User', back_populates='attributes')

    __table_args__ = (
        sa.UniqueConstraint('user_id', 'attribute_name', name='uq_user_attribute_name'),
    )

    def get_typed_value(self):
        """Converts stored string to typed value based on data_type."""
        if self.data_type == 'integer':
            try:
                return int(self.attribute_value)
            except ValueError:
                return self.attribute_value
        elif self.data_type == 'boolean':
            return self.attribute_value.lower() in ('true', '1', 'yes')
        return self.attribute_value
