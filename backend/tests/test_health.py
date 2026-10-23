import pytest
from unittest.mock import patch
from app import create_app


@pytest.fixture
def test_client():
    app = create_app('testing')
    with app.test_client() as client:
        yield client


def test_health_endpoint_testing_connected(test_client):
    """Test /api/health when testing database is connected."""
    response = test_client.get('/api/health')
    assert response.status_code == 200
    
    data = response.get_json()
    assert data is not None
    assert data.get('status') == 'healthy'
    assert data.get('service') == 'abac-enterprise-engine'
    assert 'timestamp' in data
    assert 'Phase 2' in data.get('phase', '')
    
    db_info = data.get('database', {})
    assert db_info.get('configured') is True
    assert db_info.get('connected') is True
    assert db_info.get('status') == 'connected'
    assert 'latency_ms' in db_info


def test_health_endpoint_unconfigured_database():
    """Test /api/health when DATABASE_URL is not set in development mode."""
    app = create_app('development')
    app.config['SQLALCHEMY_DATABASE_URI'] = None
    app.config['ORDS_BASE_URL'] = ''
    with app.test_client() as client:
        response = client.get('/api/health')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data.get('status') == 'healthy'
        db_info = data.get('database', {})
        assert db_info.get('configured') is False
        assert db_info.get('connected') is False
        assert db_info.get('status') == 'not_configured'


def test_health_endpoint_placeholder_credentials():
    """Test /api/health when DATABASE_URL has [YOUR-PASSWORD] placeholder."""
    app = create_app('testing')
    with app.test_client() as client:
        with patch('app.routes.health.check_database_connectivity') as mock_check:
            mock_check.return_value = {
                'configured': True,
                'status': 'unverified_placeholder',
                'connected': False,
                'dialect': 'postgresql',
                'message': 'Database URL contains placeholder credentials. Replace [YOUR-PASSWORD] in backend/.env with your actual Supabase database password.'
            }
            response = client.get('/api/health')
            assert response.status_code == 200
            data = response.get_json()
            assert data.get('status') == 'healthy'
            db_info = data.get('database', {})
            assert db_info.get('configured') is True
            assert db_info.get('connected') is False
            assert db_info.get('status') == 'unverified_placeholder'


def test_health_endpoint_failing_database():
    """Test /api/health returns 503 degraded when a configured database fails connection."""
    app = create_app('testing')
    with app.test_client() as client:
        with patch('app.routes.health.check_database_connectivity') as mock_check:
            mock_check.return_value = {
                'configured': True,
                'status': 'connection_failed',
                'connected': False,
                'dialect': 'postgresql',
                'error': 'Unable to establish database connection'
            }
            response = client.get('/api/health')
            assert response.status_code == 503
            
            data = response.get_json()
            assert data.get('status') == 'degraded'
            db_info = data.get('database', {})
            assert db_info.get('connected') is False
            assert db_info.get('status') == 'connection_failed'
            assert db_info.get('error') == 'Unable to establish database connection'


def test_health_endpoint_zero_secret_leakage(test_client):
    """Ensure no passwords, tokens, hostnames, or secret patterns are leaked in health payload."""
    response = test_client.get('/api/health')
    content = response.get_data(as_text=True).lower()
    
    forbidden_terms = ['password', 'secret', 'token', 'postgres:', 'supabase.co']
    for term in forbidden_terms:
        assert term not in content
