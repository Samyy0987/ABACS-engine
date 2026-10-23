import os
import click
from flask import Flask
from flask_cors import CORS
from .config import config_by_name
from .database import db, migrate


def create_app(config_name=None):
    """
    Application factory for ABAC Enterprise Engine.
    Configures SQLAlchemy, migrations, CORS, routes, and safe CLI commands.
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
        
    flask_app = Flask(__name__)
    config_class = config_by_name.get(config_name, config_by_name['default'])
    flask_app.config.from_object(config_class)
    
    # Initialize SQLAlchemy database extension if URI is configured
    has_db_uri = bool(flask_app.config.get('SQLALCHEMY_DATABASE_URI'))
    if has_db_uri:
        db.init_app(flask_app)
        migrate.init_app(flask_app, db)
    
    # Register models with app context using relative import to avoid variable shadowing
    with flask_app.app_context():
        from . import models as _models  # noqa: F401
    
    # Configure CORS for frontend access
    CORS(
        flask_app,
        resources={r"/api/*": {"origins": flask_app.config.get('CORS_ORIGINS', ['http://localhost:5173'])}},
        supports_credentials=True
    )
    
    # Register blueprints
    from .routes.health import health_bp
    from .routes.abac import abac_bp
    flask_app.register_blueprint(health_bp)
    flask_app.register_blueprint(abac_bp)
    
    # Safe CLI command to initialize schema without dropping existing tables
    @flask_app.cli.command('init-db')
    def init_db_command():
        """Creates tables if they do not exist. Never drops or overwrites data."""
        with flask_app.app_context():
            if not has_db_uri:
                click.echo("[!] Cannot initialize database: DATABASE_URL is not configured in .env.")
                return
            db.create_all()
            click.echo("[*] ABAC Engine database schema initialized successfully (no tables dropped).")
            
    return flask_app
