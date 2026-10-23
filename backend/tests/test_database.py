import pytest
from unittest.mock import MagicMock, patch
from app.config import normalize_database_url
from app.database import check_database_connectivity
from app import create_app


def test_normalize_database_url():
    """Verify URL scheme normalization for PostgreSQL and Supabase."""
    # Legacy Supabase / Heroku postgres:// -> postgresql://
    legacy = "postgres://postgres:secretpassword@db.xyz.supabase.co:5432/postgres"
    expected = "postgresql://postgres:secretpassword@db.xyz.supabase.co:5432/postgres"
    assert normalize_database_url(legacy) == expected

    # Standard postgresql:// unchanged
    standard = "postgresql://postgres:secretpassword@db.xyz.supabase.co:5432/postgres"
    assert normalize_database_url(standard) == standard

    # Driver-specific scheme postgresql+psycopg:// unchanged
    psycopg_url = "postgresql+psycopg://postgres:secret@db.xyz.supabase.co:5432/postgres"
    assert normalize_database_url(psycopg_url) == psycopg_url

    # Empty, whitespace, or None returns None
    assert normalize_database_url("") is None
    assert normalize_database_url("   ") is None
    assert normalize_database_url(None) is None


def test_connectivity_check_unconfigured():
    """Verify connectivity check returns safe payload when database is unconfigured."""
    app = create_app('development')
    with app.app_context():
        # Ensure URI is None in this test
        app.config['SQLALCHEMY_DATABASE_URI'] = None
        result = check_database_connectivity()
        
        assert result['configured'] is False
        assert result['status'] == 'not_configured'
        assert result['connected'] is False
        assert 'Database URL not configured' in result['message']
        
        # Security audit: Payload must NEVER contain connection strings or secrets
        for key in result:
            assert 'postgres' not in str(result[key]).lower()
            assert 'password' not in str(result[key]).lower()


def test_connectivity_check_connected():
    """Verify connectivity check against in-memory testing SQLite database."""
    app = create_app('testing')
    with app.app_context():
        result = check_database_connectivity()
        assert result['configured'] is True
        assert result['status'] == 'connected'
        assert result['connected'] is True
        assert 'latency_ms' in result
        assert result['latency_ms'] >= 0


def test_connectivity_check_connection_failure():
    """Verify that connection failures return sanitized errors without credential leakage."""
    from sqlalchemy.engine import make_url
    mock_engine = MagicMock()
    mock_engine.url = make_url("postgresql://postgres:SUPER_SECRET_PASSWORD@db.supabase.co:5432/postgres")
    mock_engine.dialect.name = "postgresql"
    mock_engine.connect.side_effect = Exception("FATAL: password authentication failed for user 'postgres'")

    result = check_database_connectivity(engine=mock_engine)
    
    assert result['configured'] is True
    assert result['status'] == 'connection_failed'
    assert result['connected'] is False
    assert result['error'] == 'Unable to establish database connection'
    
    # Crucial security check: Ensure the secret password and URL were not leaked in the result
    result_str = str(result)
    assert 'SUPER_SECRET_PASSWORD' not in result_str
    assert 'db.supabase.co' not in result_str
    assert 'password authentication failed' not in result_str


def test_connectivity_check_placeholder_detection():
    """Verify that placeholder passwords are safely caught without network calls."""
    from sqlalchemy.engine import make_url
    mock_engine = MagicMock()
    mock_engine.url = make_url("postgresql://postgres:[YOUR-PASSWORD]@db.wzthqblwvyftnqazurta.supabase.co:5432/postgres")
    mock_engine.dialect.name = "postgresql"

    result = check_database_connectivity(engine=mock_engine)
    assert result['configured'] is True
    assert result['status'] == 'unverified_placeholder'
    assert result['connected'] is False
    assert 'placeholder credentials' in result['message']
    mock_engine.connect.assert_not_called()

