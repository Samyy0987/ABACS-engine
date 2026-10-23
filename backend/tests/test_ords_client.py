import time
import json
import pytest
from unittest.mock import MagicMock, patch
import requests
from app.services.ords_client import (
    ORDSClient,
    ORDSError,
    ORDSConnectionError,
    ORDSAuthenticationError,
    ORDSTimeoutError,
    ORDSResourceNotFoundError,
)


@pytest.fixture
def mock_session():
    return MagicMock(spec=requests.Session)


def test_ords_client_unconfigured():
    client = ORDSClient(base_url='')
    assert not client.is_configured
    health = client.check_health()
    assert health['configured'] is False
    assert health['status'] == 'not_configured'
    assert health['connected'] is False

    with pytest.raises(ORDSConnectionError):
        client.get_policies()


def test_ords_client_health_check_success(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)
    assert client.is_configured

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b'{"status":"healthy","service":"oracle-ords-abac","active_policy_count":5}'
    mock_resp.json.return_value = {
        'status': 'healthy',
        'service': 'oracle-ords-abac',
        'active_policy_count': 5,
    }
    mock_session.request.return_value = mock_resp

    health = client.check_health()
    assert health['configured'] is True
    assert health['connected'] is True
    assert health['status'] == 'connected'
    assert health['active_policy_count'] == 5
    assert 'latency_ms' in health
    assert health['dialect'] == 'oracle-ords-rest'


def test_ords_client_health_check_timeout(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)
    mock_session.request.side_effect = requests.exceptions.Timeout("Request timed out")

    health = client.check_health()
    assert health['configured'] is True
    assert health['connected'] is False
    assert health['status'] == 'connection_timeout'
    assert 'error' in health


def test_ords_client_health_check_auth_failure(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_session.request.return_value = mock_resp

    health = client.check_health()
    assert health['configured'] is True
    assert health['connected'] is False
    assert health['status'] == 'authentication_failed'


def test_ords_client_oauth2_token_caching(mock_session):
    client = ORDSClient(
        base_url='https://apex.oracle.com/ords/my_schema/abac/v1',
        auth_mode='oauth2',
        client_id='test-client-id',
        client_secret='test-client-secret',
        token_url='https://apex.oracle.com/ords/my_schema/oauth/token',
        session=mock_session,
    )

    # Mock token exchange response
    token_resp = MagicMock()
    token_resp.status_code = 200
    token_resp.json.return_value = {
        'access_token': 'mock-access-token-12345',
        'token_type': 'bearer',
        'expires_in': 3600,
    }
    mock_session.post.return_value = token_resp

    # First call retrieves token
    headers = client._get_auth_header()
    assert headers == {'Authorization': 'Bearer mock-access-token-12345'}
    assert mock_session.post.call_count == 1

    # Second call reuses cached token without calling POST again
    headers2 = client._get_auth_header()
    assert headers2 == {'Authorization': 'Bearer mock-access-token-12345'}
    assert mock_session.post.call_count == 1


def test_ords_client_get_policies_normalization(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)

    raw_items = [
        {
            'id': 'p1',
            'code': 'pol-secops',
            'name': 'SecOps Access',
            'is_enabled': 1,
            'actions': '["READ", "UPDATE"]',
            'conditions': '{"subject": {"role": ["SecOps"]}}',
            'priority': 1,
            'effect': 'PERMIT',
        },
        {
            'id': 'p2',
            'code': 'pol-deny',
            'name': 'Deny Public',
            'is_enabled': 0,
            'actions': ['DELETE'],
            'conditions': {'resource': {'classification': 'TopSecret'}},
            'priority': 2,
            'effect': 'DENY',
        }
    ]

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {'items': raw_items}
    mock_session.request.return_value = mock_resp

    policies = client.get_policies()
    assert len(policies) == 2

    # Verify normalization of p1
    assert policies[0]['is_enabled'] is True
    assert policies[0]['actions'] == ['READ', 'UPDATE']
    assert policies[0]['conditions'] == {'subject': {'role': ['SecOps']}}

    # Verify normalization of p2
    assert policies[1]['is_enabled'] is False
    assert policies[1]['actions'] == ['DELETE']
    assert policies[1]['conditions'] == {'resource': {'classification': 'TopSecret'}}


def test_ords_client_crud_operations(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)

    # 1. Create policy
    create_resp = MagicMock()
    create_resp.status_code = 201
    create_resp.content = b'{"status":"created","id":"new-id"}'
    create_resp.json.return_value = {'status': 'created', 'id': 'new-id'}
    mock_session.request.return_value = create_resp

    res = client.create_policy({'code': 'test-pol', 'name': 'Test Policy'})
    assert res['status'] == 'created'

    # 2. Update policy
    update_resp = MagicMock()
    update_resp.status_code = 200
    update_resp.content = b'{"status":"updated"}'
    update_resp.json.return_value = {'status': 'updated'}
    mock_session.request.return_value = update_resp

    res_up = client.update_policy('new-id', {'name': 'Updated Name'})
    assert res_up['status'] == 'updated'

    # 3. Delete policy
    delete_resp = MagicMock()
    delete_resp.status_code = 200
    delete_resp.content = b'{"status":"deleted"}'
    delete_resp.json.return_value = {'status': 'deleted'}
    mock_session.request.return_value = delete_resp

    res_del = client.delete_policy('new-id')
    assert res_del['status'] == 'deleted'


def test_ords_client_user_attributes_type_conversion(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        'items': [
            {'attribute_name': 'role', 'attribute_value': 'SecOps', 'data_type': 'string'},
            {'attribute_name': 'clearance_level', 'attribute_value': '3', 'data_type': 'integer'},
            {'attribute_name': 'mfa_enforced', 'attribute_value': 'true', 'data_type': 'boolean'},
        ]
    }
    mock_session.request.return_value = mock_resp

    attrs = client.get_user_attributes('user-123')
    assert attrs['role'] == 'SecOps'
    assert attrs['clearance_level'] == 3
    assert attrs['mfa_enforced'] is True


def test_create_audit_log_success(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.content = b'{"status":"logged","id":"log-101","request_id":"req-202"}'
    mock_resp.json.return_value = {'status': 'logged', 'id': 'log-101', 'request_id': 'req-202'}
    mock_session.request.return_value = mock_resp

    res = client.create_audit_log({
        'id': 'log-101',
        'request_id': 'req-202',
        'subject_identifier': 'alice',
        'resource_key': 'doc',
        'action': 'READ',
        'decision': 'PERMIT',
    })

    assert res['status'] == 'logged'
    assert res['id'] == 'log-101'
    mock_session.request.assert_called_once()
    assert mock_session.request.call_args[1]['json']['id'] == 'log-101'


def test_create_audit_log_http_error_with_safe_body(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.text = '{"error": "ORA-00001: unique constraint violated"}'
    mock_resp.json.return_value = {'error': 'ORA-00001: unique constraint violated'}
    mock_session.request.return_value = mock_resp

    with pytest.raises(ORDSError) as exc_info:
        client.create_audit_log({'id': 'log-dup'})

    assert 'HTTP 500' in str(exc_info.value)
    assert 'ORA-00001' in str(exc_info.value)


def test_create_audit_log_403_forbidden_diagnostics(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 403
    mock_resp.text = '{"message": "The request requires authorization.", "token": "secret_token_123"}'
    mock_resp.json.return_value = {'message': 'The request requires authorization.', 'token': 'secret_token_123'}
    mock_session.request.return_value = mock_resp

    with pytest.raises(ORDSAuthenticationError) as exc_info:
        client.create_audit_log({'id': 'log-auth'})

    msg = str(exc_info.value)
    assert 'HTTP 403' in msg
    assert 'secret_token_123' not in msg
    assert '[REDACTED]' in msg


def test_create_audit_log_connection_and_timeout_errors(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)

    # 1. Connection error
    mock_session.request.side_effect = requests.exceptions.ConnectionError("Connection refused")
    with pytest.raises(ORDSConnectionError):
        client.create_audit_log({'id': 'log-conn'})

    # 2. Timeout error
    mock_session.request.side_effect = requests.exceptions.Timeout("Read timeout")
    with pytest.raises(ORDSTimeoutError):
        client.create_audit_log({'id': 'log-timeout'})


def test_get_audit_logs_parsing(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        'items': [
            {
                'id': 'log-1',
                'request_id': 'req-1',
                'subject_identifier': 'alice',
                'resource_key': 'records',
                'action': 'READ',
                'decision': 'PERMIT',
                'matched_policy_ids': '["pol-secops", "pol-admin"]',
                'context_snapshot': '{"subject": {"role": "SecOps"}}',
                'evaluation_duration_ms': 15.2,
                'client_ip': '192.168.1.10',
                'timestamp': '2026-10-18T10:00:00.000Z',
            }
        ]
    }
    mock_session.request.return_value = mock_resp

    logs = client.get_audit_logs()
    assert len(logs) == 1
    log0 = logs[0]
    assert log0['id'] == 'log-1'
    assert log0['matched_policy_ids'] == ['pol-secops', 'pol-admin']
    assert log0['context_snapshot'] == {'subject': {'role': 'SecOps'}}
    assert log0['decision'] == 'PERMIT'


def test_create_audit_log_invalid_json_response(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.content = b'<html>Bad Gateway or Malformed</html>'
    mock_resp.text = '<html>Bad Gateway or Malformed</html>'
    mock_resp.json.side_effect = ValueError("Invalid JSON")
    mock_session.request.return_value = mock_resp

    with pytest.raises(ORDSError) as exc_info:
        client.create_audit_log({'id': 'test-1'})

    assert 'invalid json' in str(exc_info.value).lower()


def test_get_audit_logs_invalid_json_response(mock_session):
    client = ORDSClient(base_url='https://apex.oracle.com/ords/my_schema/abac/v1', session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b'Not a json response'
    mock_resp.text = 'Not a json response'
    mock_resp.json.side_effect = ValueError("Invalid JSON")
    mock_session.request.return_value = mock_resp

    with pytest.raises(ORDSError) as exc_info:
        client.get_audit_logs()

    assert 'invalid json' in str(exc_info.value).lower()


