import pytest
from unittest.mock import MagicMock
from app.services.ords_client import ORDSClient, ORDSConnectionError, ORDSTimeoutError
from app.services.abac_engine import ABACDecisionEngine, AccessRequest, EvaluationResult


@pytest.fixture
def mock_ords_client():
    return MagicMock(spec=ORDSClient)


def test_abac_engine_permit_matching_policy(mock_ords_client):
    engine = ABACDecisionEngine(ords_client=mock_ords_client)

    # Mock policy returned from ORDS
    mock_ords_client.get_policies.return_value = [
        {
            'id': 'p1',
            'code': 'pol-secops',
            'name': 'SecOps Cluster Access',
            'is_enabled': True,
            'priority': 1,
            'effect': 'PERMIT',
            'actions': ['READ', 'EXECUTE'],
            'conditions': {
                'subject': {'role': ['SecOps', 'Admin'], 'mfaEnforced': True},
                'resource': {'classification': 'Critical'},
            }
        }
    ]

    req = AccessRequest(
        subject_identifier='alice@enterprise.local',
        resource_key='k8s-cluster-alpha',
        action='READ',
        subject_attributes={'role': 'SecOps', 'mfaEnforced': True},
        resource_attributes={'classification': 'Critical'},
        environment_attributes={'ipRange': '10.240.0.1'},
    )

    result = engine.evaluate(req)
    assert result.decision == 'PERMIT'
    assert 'pol-secops' in result.matched_policies
    assert result.audit_logged is True
    assert mock_ords_client.create_audit_log.call_count == 1


def test_abac_engine_deny_matching_policy(mock_ords_client):
    engine = ABACDecisionEngine(ords_client=mock_ords_client)

    mock_ords_client.get_policies.return_value = [
        {
            'id': 'p2',
            'code': 'pol-deny-after-hours',
            'name': 'Deny Production Writes',
            'is_enabled': True,
            'priority': 5,
            'effect': 'DENY',
            'actions': ['DELETE', 'UPDATE'],
            'conditions': {
                'resource': {'classification': 'Production_Database'},
            }
        }
    ]

    req = AccessRequest(
        subject_identifier='bob@enterprise.local',
        resource_key='db-prod-primary',
        action='DELETE',
        subject_attributes={'role': 'Developer'},
        resource_attributes={'classification': 'Production_Database'},
    )

    result = engine.evaluate(req)
    assert result.decision == 'DENY'
    assert 'pol-deny-after-hours' in result.matched_policies


def test_abac_engine_deny_overrides_conflict(mock_ords_client):
    """When both PERMIT and DENY policies match, DENY must strictly override."""
    engine = ABACDecisionEngine(ords_client=mock_ords_client)

    mock_ords_client.get_policies.return_value = [
        {
            'id': 'p1',
            'code': 'pol-permit-all-reads',
            'is_enabled': True,
            'priority': 1,
            'effect': 'PERMIT',
            'actions': ['READ'],
            'conditions': {'subject': {'department': 'Engineering'}}
        },
        {
            'id': 'p2',
            'code': 'pol-deny-restricted-vault',
            'is_enabled': True,
            'priority': 2,
            'effect': 'DENY',
            'actions': ['READ'],
            'conditions': {'resource': {'restricted': True}}
        }
    ]

    req = AccessRequest(
        subject_identifier='charlie@enterprise.local',
        resource_key='secret-vault',
        action='READ',
        subject_attributes={'department': 'Engineering'},
        resource_attributes={'restricted': True},
    )

    result = engine.evaluate(req)
    assert result.decision == 'DENY'
    assert 'pol-deny-restricted-vault' in result.matched_policies


def test_abac_engine_default_deny_when_no_policy_matches(mock_ords_client):
    """If no active policy matches the request, default deny is enforced."""
    engine = ABACDecisionEngine(ords_client=mock_ords_client)
    mock_ords_client.get_policies.return_value = []

    req = AccessRequest(
        subject_identifier='dave@enterprise.local',
        resource_key='internal-api',
        action='EXPORT',
        subject_attributes={'role': 'Guest'},
    )

    result = engine.evaluate(req)
    assert result.decision == 'DENY'
    assert len(result.matched_policies) == 0
    assert 'default deny' in result.reason.lower()


def test_abac_engine_fail_safe_on_ords_exception(mock_ords_client):
    """If ORDS endpoint times out or fails, fail-safe closed (DENY)."""
    engine = ABACDecisionEngine(ords_client=mock_ords_client)
    mock_ords_client.get_policies.side_effect = ORDSTimeoutError("ORDS timeout")

    req = AccessRequest(
        subject_identifier='eve@enterprise.local',
        resource_key='financial-records',
        action='READ',
        subject_attributes={'role': 'CFO'},
    )

    result = engine.evaluate(req)
    assert result.decision == 'DENY'
    assert 'default deny' in result.reason.lower()


def test_abac_engine_redacts_secrets_in_audit_logs(mock_ords_client):
    """Ensure passwords, tokens, and client secrets are sanitized before audit dispatch."""
    engine = ABACDecisionEngine(ords_client=mock_ords_client)
    mock_ords_client.get_policies.return_value = []

    req = AccessRequest(
        subject_identifier='frank@enterprise.local',
        resource_key='oauth-server',
        action='GET',
        subject_attributes={
            'username': 'frank',
            'password': 'SuperSecretPassword123!',
            'token': 'bearer-token-abc',
        },
        resource_attributes={
            'client_secret': 'my-secret-value',
            'api_key': 'key-98765',
        },
        environment_attributes={
            'auth_header': 'Bearer xyz',
        }
    )

    result = engine.evaluate(req)
    assert result.decision == 'DENY'

    # Inspect the payload passed to mock_ords_client.create_audit_log
    mock_ords_client.create_audit_log.assert_called_once()
    call_args = mock_ords_client.create_audit_log.call_args[0][0]
    snapshot = call_args['context_snapshot']

    assert snapshot['subject']['password'] == '[REDACTED]'
    assert snapshot['subject']['token'] == '[REDACTED]'
    assert snapshot['subject']['username'] == 'frank'
    assert snapshot['resource']['client_secret'] == '[REDACTED]'
    assert snapshot['resource']['api_key'] == '[REDACTED]'


def test_abac_engine_audit_log_success_sets_flag(mock_ords_client):
    """Successful ORDS audit log creation sets audit_logged to True and storage to oracle_ords."""
    engine = ABACDecisionEngine(ords_client=mock_ords_client)
    mock_ords_client.get_policies.return_value = []
    mock_ords_client.create_audit_log.return_value = {'status': 'logged', 'id': 'test-id'}

    req = AccessRequest(
        subject_identifier='audit-tester@enterprise.local',
        resource_key='doc-1',
        action='READ',
    )

    result = engine.evaluate(req)
    assert result.decision == 'DENY'
    assert result.audit_logged is True
    assert result.audit_storage == 'oracle_ords'
    mock_ords_client.create_audit_log.assert_called_once()


def test_abac_engine_audit_log_failure_leaves_flag_false(mock_ords_client):
    """When both ORDS and fallback fail, audit_logged is False and evaluation does not crash."""
    from app.services.ords_client import ORDSError
    mock_fallback = MagicMock()
    mock_fallback.save_audit_log.return_value = False
    engine = ABACDecisionEngine(ords_client=mock_ords_client, fallback_store=mock_fallback)
    mock_ords_client.get_policies.return_value = []
    mock_ords_client.create_audit_log.side_effect = ORDSError("ORDS returned error HTTP 500: Database error")

    req = AccessRequest(
        subject_identifier='audit-tester@enterprise.local',
        resource_key='doc-1',
        action='READ',
    )

    result = engine.evaluate(req)
    assert result.decision == 'DENY'
    assert result.audit_logged is False
    assert result.audit_storage == 'none'
    mock_ords_client.create_audit_log.assert_called_once()
    mock_fallback.save_audit_log.assert_called_once()

