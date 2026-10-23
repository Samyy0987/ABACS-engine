import pytest
from unittest.mock import patch, MagicMock
from app import create_app


@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as c:
        yield c


def test_policies_route_unconfigured(client):
    """When ORDS is unconfigured, return 503 status."""
    with patch('app.routes.abac.get_ords_client') as mock_get:
        mock_client = MagicMock()
        mock_client.is_configured = False
        mock_get.return_value = mock_client

        resp = client.get('/api/policies')
        assert resp.status_code == 503
        data = resp.get_json()
        assert 'not configured' in data['error']


def test_policies_route_configured(client):
    """When ORDS is configured, return policy list."""
    with patch('app.routes.abac.get_ords_client') as mock_get:
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.get_policies.return_value = [
            {'code': 'pol-1', 'name': 'Policy 1', 'is_enabled': True}
        ]
        mock_get.return_value = mock_client

        resp = client.get('/api/policies')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['count'] == 1
        assert data['policies'][0]['code'] == 'pol-1'


def test_evaluate_route(client):
    """Test /api/evaluate endpoint dispatches to ABACDecisionEngine."""
    with patch('app.routes.abac.ABACDecisionEngine') as mock_engine_cls:
        mock_engine = MagicMock()
        from app.services.abac_engine import EvaluationResult
        mock_engine.evaluate.return_value = EvaluationResult(
            decision='PERMIT',
            request_id='req-123',
            subject_identifier='alice',
            resource_key='res-456',
            action='READ',
            matched_policies=['pol-1'],
            reason='Permitted by policy: pol-1',
            evaluation_duration_ms=1.5,
            audit_logged=True,
        )
        mock_engine_cls.return_value = mock_engine

        resp = client.post('/api/evaluate', json={
            'subject_identifier': 'alice',
            'resource_key': 'res-456',
            'action': 'READ',
            'subject_attributes': {'role': 'SecOps'},
        })

        assert resp.status_code == 200
        data = resp.get_json()
        assert data['decision'] == 'PERMIT'
        assert data['matched_policies'] == ['pol-1']
        assert data['audit_logged'] is True


def test_evaluate_missing_fields(client):
    resp = client.post('/api/evaluate', json={'action': 'READ'})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data['decision'] == 'DENY'


def test_resources_route_success(client):
    with patch('app.routes.abac.get_ords_client') as mock_get:
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.get_resources.return_value = [
            {'id': 'res-1', 'resource_key': 'k8s-cluster', 'name': 'Cluster Alpha', 'is_active': True}
        ]
        mock_get.return_value = mock_client

        resp = client.get('/api/resources')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['count'] == 1
        assert data['resources'][0]['resource_key'] == 'k8s-cluster'


def test_resources_route_ords_error(client):
    from app.services.ords_client import ORDSError
    with patch('app.routes.abac.get_ords_client') as mock_get:
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.get_resources.side_effect = ORDSError("ORDS 502 error")
        mock_get.return_value = mock_client

        resp = client.get('/api/resources')
        assert resp.status_code == 502
        data = resp.get_json()
        assert 'Failed to fetch resources' in data['error']


def test_users_route_success(client):
    with patch('app.routes.abac.get_ords_client') as mock_get:
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.get_users.return_value = [
            {'id': 'u1', 'username': 'alice_secops', 'email': 'alice@enterprise.local', 'is_active': 1}
        ]
        mock_get.return_value = mock_client

        resp = client.get('/api/users')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['count'] == 1
        assert data['users'][0]['username'] == 'alice_secops'


def test_users_route_ords_error(client):
    from app.services.ords_client import ORDSError
    with patch('app.routes.abac.get_ords_client') as mock_get:
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.get_users.side_effect = ORDSError("ORDS 500 error")
        mock_get.return_value = mock_client

        resp = client.get('/api/users')
        assert resp.status_code == 502
        data = resp.get_json()
        assert 'Failed to fetch users' in data['error']

