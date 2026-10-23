import pytest
from app import create_app
from app.database import db
from app.models import User, UserAttribute, ProtectedResource, ResourceAttribute, Policy, AccessAuditLog
import sqlalchemy.exc


@pytest.fixture(scope='function')
def app_with_db():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def test_user_password_hashing_security(app_with_db):
    """Verify that user passwords are securely hashed and never stored plaintext."""
    user = User(username='secops_lead', email='secops@enterprise.corp')
    user.set_password('SuperSecretPass123!')
    
    # Password hash must not equal plaintext password
    assert user.password_hash != 'SuperSecretPass123!'
    assert user.password_hash.startswith('scrypt:') or user.password_hash.startswith('pbkdf2:')
    
    # Password verification checks
    assert user.check_password('SuperSecretPass123!') is True
    assert user.check_password('WrongPassword') is False
    assert user.check_password('') is False

    # to_dict must NEVER leak password_hash
    safe_dict = user.to_dict()
    assert 'password_hash' not in safe_dict
    assert 'password' not in safe_dict
    assert safe_dict['username'] == 'secops_lead'


def test_user_short_password_rejection(app_with_db):
    """Passwords shorter than 8 characters must be rejected."""
    user = User(username='test_short', email='short@enterprise.corp')
    with pytest.raises(ValueError, match="at least 8 characters"):
        user.set_password('short')


def test_user_subject_attributes_and_cascade(app_with_db):
    """Verify subject attributes relationship, typed conversions, and cascade deletion."""
    user = User(username='compliance_officer', email='compliance@enterprise.corp')
    user.set_password('EnterpriseSecure2026!')
    db.session.add(user)
    db.session.commit()

    attr1 = UserAttribute(
        user_id=user.id,
        attribute_name='clearance_level',
        attribute_value='3',
        data_type='integer'
    )
    attr2 = UserAttribute(
        user_id=user.id,
        attribute_name='mfa_enforced',
        attribute_value='true',
        data_type='boolean'
    )
    db.session.add_all([attr1, attr2])
    db.session.commit()

    # Re-query user
    loaded = db.session.get(User, user.id)
    assert len(loaded.attributes) == 2
    assert loaded.to_dict(include_attributes=True)['attributes']['clearance_level'] == 3
    assert loaded.to_dict(include_attributes=True)['attributes']['mfa_enforced'] is True

    # Test cascade deletion
    db.session.delete(loaded)
    db.session.commit()
    remaining_attrs = UserAttribute.query.filter_by(user_id=user.id).all()
    assert len(remaining_attrs) == 0


def test_user_attribute_unique_constraint(app_with_db):
    """User cannot have duplicate attribute names."""
    user = User(username='attr_test', email='attr@enterprise.corp')
    user.set_password('EnterprisePass2026!')
    db.session.add(user)
    db.session.commit()

    attr1 = UserAttribute(user_id=user.id, attribute_name='role', attribute_value='Admin')
    attr2 = UserAttribute(user_id=user.id, attribute_name='role', attribute_value='Operator')
    db.session.add(attr1)
    db.session.commit()

    db.session.add(attr2)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db.session.commit()
    db.session.rollback()


def test_protected_resource_and_attributes(app_with_db):
    """Verify ProtectedResource creation, classification, and attribute mapping."""
    resource = ProtectedResource(
        resource_key='Customer_PII_Vault',
        name='Customer PII Database Storage',
        resource_type='Database',
        classification='Confidential',
        owner_department='SecOps'
    )
    db.session.add(resource)
    db.session.commit()

    attr = ResourceAttribute(
        resource_id=resource.id,
        attribute_name='retention_years',
        attribute_value='7',
        data_type='integer'
    )
    db.session.add(attr)
    db.session.commit()

    loaded = db.session.get(ProtectedResource, resource.id)
    assert loaded.resource_key == 'Customer_PII_Vault'
    assert loaded.classification == 'Confidential'
    assert len(loaded.attributes) == 1
    assert loaded.to_dict(include_attributes=True)['attributes']['retention_years'] == 7


def test_policy_creation_with_structured_conditions(app_with_db):
    """Verify ABAC policy model with JSONB/JSON conditions, priority, and effect."""
    policy = Policy(
        code='POL-DAT-001',
        name='Customer PII Masking & Clearance Guard',
        description='Restricts PII access to authorized officers',
        category='Data Protection',
        priority=10,
        effect='PERMIT',
        is_enabled=True,
        actions=['READ', 'EXPORT'],
        conditions={
            'subject': {'role': ['Data Protection Officer'], 'clearanceLevel': 'Level 3+'},
            'resource': {'classification': 'Confidential', 'type': 'Customer_PII_Vault'},
            'environment': {'ipRange': '10.240.0.0/16', 'allowedHours': '08:00 - 19:00 UTC'}
        },
        version='1.0.0'
    )
    db.session.add(policy)
    db.session.commit()

    loaded = Policy.query.filter_by(code='POL-DAT-001').first()
    assert loaded is not None
    assert loaded.effect == 'PERMIT'
    assert loaded.is_enabled is True
    assert 'READ' in loaded.actions
    assert loaded.conditions['subject']['clearanceLevel'] == 'Level 3+'
    
    # Test unique code constraint
    duplicate = Policy(
        code='POL-DAT-001',
        name='Duplicate Policy',
        category='Data Protection',
        effect='DENY',
        actions=['READ'],
        conditions={}
    )
    db.session.add(duplicate)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db.session.commit()
    db.session.rollback()


def test_access_audit_log(app_with_db):
    """Verify AccessAuditLog records authorization decisions and contextual snapshots."""
    audit = AccessAuditLog(
        request_id='req-987654',
        subject_identifier='secops_lead',
        resource_key='Customer_PII_Vault',
        action='READ',
        decision='PERMIT',
        matched_policy_ids=['POL-DAT-001'],
        context_snapshot={
            'subject_role': 'Data Protection Officer',
            'client_ip': '10.240.1.5',
            'time_utc': '14:22:00'
        },
        evaluation_duration_ms=4.8,
        client_ip='10.240.1.5'
    )
    db.session.add(audit)
    db.session.commit()

    loaded = AccessAuditLog.query.filter_by(request_id='req-987654').first()
    assert loaded is not None
    assert loaded.decision == 'PERMIT'
    assert loaded.evaluation_duration_ms == 4.8
    assert loaded.context_snapshot['client_ip'] == '10.240.1.5'
    assert loaded.to_dict()['request_id'] == 'req-987654'
