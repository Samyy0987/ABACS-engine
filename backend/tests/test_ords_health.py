import pytest
from unittest.mock import patch, MagicMock
from app import create_app


def test_health_endpoint_with_ords_healthy():
    """Test /api/health when ORDS is configured and returns healthy ping."""
    app = create_app('testing')
    app.config['ORDS_BASE_URL'] = 'https://apex.oracle.com/ords/my_schema/abac/v1'

    with app.test_client() as client:
        with patch('app.routes.health.get_ords_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.check_health.return_value = {
                'configured': True,
                'status': 'connected',
                'connected': True,
                'dialect': 'oracle-ords-rest',
                'latency_ms': 42.5,
                'ords_service': 'oracle-ords-abac',
                'active_policy_count': 3,
                'message': 'Oracle ORDS REST API verified',
            }
            mock_get_client.return_value = mock_client

            response = client.get('/api/health')
            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'healthy'
            assert 'Oracle APEX/ORDS' in data['phase']
            assert data['ords']['connected'] is True
            assert data['ords']['dialect'] == 'oracle-ords-rest'
            assert data['ords']['active_policy_count'] == 3


def test_health_endpoint_with_ords_degraded():
    """Test /api/health returns 503 degraded when ORDS ping fails."""
    app = create_app('testing')
    app.config['ORDS_BASE_URL'] = 'https://apex.oracle.com/ords/my_schema/abac/v1'

    with app.test_client() as client:
        with patch('app.routes.health.get_ords_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.check_health.return_value = {
                'configured': True,
                'status': 'connection_timeout',
                'connected': False,
                'dialect': 'oracle-ords-rest',
                'error': 'Connection to ORDS endpoint timed out',
            }
            mock_get_client.return_value = mock_client

            response = client.get('/api/health')
            assert response.status_code == 503
            data = response.get_json()
            assert data['status'] == 'degraded'
            assert data['ords']['connected'] is False
            assert data['ords']['status'] == 'connection_timeout'
