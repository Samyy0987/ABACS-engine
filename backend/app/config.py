import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
config_dir = Path(__file__).resolve().parent
backend_dir = config_dir.parent
root_dir = backend_dir.parent

backend_env = backend_dir / '.env'
root_env = root_dir / '.env'

# 1. Load root .env if it exists
if root_env.exists():
    load_dotenv(root_env, override=True)

# 2. Load backend/.env with highest precedence
if backend_env.exists():
    load_dotenv(backend_env, override=True)

# 3. Fallback to standard dotenv discovery
load_dotenv(override=True)


def normalize_database_url(raw_url: str | None) -> str | None:
    """
    Normalizes database connection URLs.
    Converts legacy 'postgres://' scheme to SQLAlchemy-compatible 'postgresql://'.
    Preserves 'postgresql://', 'postgresql+psycopg://', and 'postgresql+psycopg2://'.
    """
    if not raw_url:
        return None
    url = raw_url.strip()
    if not url:
        return None
    if url.startswith('postgres://'):
        url = 'postgresql://' + url[len('postgres://'):]
    return url


class Config:
    """Base configuration loaded from environment variables."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-abac-engine-secret-key-phase2')
    DEBUG = os.environ.get('FLASK_DEBUG', '0') == '1'
    TESTING = False
    
    # Server host and port
    HOST = os.environ.get('HOST', '127.0.0.1')
    PORT = int(os.environ.get('PORT', '5000'))
    
    # CORS Configuration
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.environ.get(
            'CORS_ORIGINS',
            'http://localhost:5173,http://127.0.0.1:5173'
        ).split(',')
        if origin.strip()
    ]
    
    # Database Configuration (Supabase PostgreSQL / SQLAlchemy)
    RAW_DATABASE_URL = os.environ.get('DATABASE_URL', '')
    DATABASE_URL = normalize_database_url(RAW_DATABASE_URL)
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Engine pool options (configured for resilient cloud database connections)
    # Never disables TLS/SSL verification
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # =========================================================================
    # Oracle APEX / ORDS REST API Configuration
    # =========================================================================
    ORDS_BASE_URL = os.environ.get('ORDS_BASE_URL', '').strip()
    ORDS_AUTH_MODE = os.environ.get('ORDS_AUTH_MODE', 'none').strip().lower()
    ORDS_CLIENT_ID = os.environ.get('ORDS_CLIENT_ID', '').strip()
    ORDS_CLIENT_SECRET = os.environ.get('ORDS_CLIENT_SECRET', '').strip()
    ORDS_TOKEN_URL = os.environ.get('ORDS_TOKEN_URL', '').strip()
    ORDS_BASIC_USERNAME = os.environ.get('ORDS_BASIC_USERNAME', '').strip()
    ORDS_BASIC_PASSWORD = os.environ.get('ORDS_BASIC_PASSWORD', '').strip()
    ORDS_BEARER_TOKEN = os.environ.get('ORDS_BEARER_TOKEN', '').strip()
    ORDS_TIMEOUT_SECONDS = float(os.environ.get('ORDS_TIMEOUT_SECONDS', '5.0'))
    ORDS_MAX_RETRIES = int(os.environ.get('ORDS_MAX_RETRIES', '1'))

    # Local SQLite Audit Fallback Storage
    AUDIT_FALLBACK_DB_PATH = os.environ.get(
        'AUDIT_FALLBACK_DB_PATH',
        str(backend_dir / 'data' / 'audit_fallback.db')
    )


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    SECRET_KEY = 'test-secret-key-phase2'
    # Default to in-memory SQLite for unit tests so tests do not require production credentials
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or 'sqlite:///:memory:'
    DATABASE_URL = SQLALCHEMY_DATABASE_URI
    SQLALCHEMY_ENGINE_OPTIONS = {}
    # Keep unit tests isolated from live ORDS credentials in .env
    ORDS_BASE_URL = os.environ.get('TEST_ORDS_BASE_URL', '')
    AUDIT_FALLBACK_DB_PATH = os.environ.get(
        'TEST_AUDIT_FALLBACK_DB_PATH',
        str(backend_dir / 'data' / 'test_audit_fallback.db')
    )


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
