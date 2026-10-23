from datetime import datetime, timezone
from flask import Blueprint, jsonify
from ..database import check_database_connectivity
from ..services.ords_client import get_ords_client

health_bp = Blueprint('health', __name__, url_prefix='/api')


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for ABAC Engine.
    Reports service status, environment, phase, and safe backend connectivity.
    Supports Oracle ORDS REST integration as well as fallback database connectivity.
    Guarantees no URLs, passwords, tokens, hostnames, or raw exception traces are exposed.
    """
    ords_client = get_ords_client()

    # Priority: If ORDS base URL is configured, use ORDS REST health check exclusively
    if ords_client.is_configured:
        ords_status = ords_client.check_health()
        is_healthy = ords_status.get('connected', False)
        status_label = 'healthy' if is_healthy else 'degraded'
        http_code = 200 if is_healthy else 503

        return jsonify({
            'status': status_label,
            'service': 'abac-enterprise-engine',
            'version': '1.1.0-phaseB',
            'phase': 'Phase 2 - Oracle APEX/ORDS Integration',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'database': ords_status,
            'ords': ords_status,
        }), http_code

    # Otherwise check database connectivity (for legacy/testing config)
    db_status = check_database_connectivity()

    is_healthy = (
        db_status.get('connected')
        or not db_status.get('configured')
        or db_status.get('status') == 'unverified_placeholder'
    )
    status_label = 'healthy' if is_healthy else 'degraded'
    http_code = 200 if is_healthy else 503

    return jsonify({
        'status': status_label,
        'service': 'abac-enterprise-engine',
        'version': '1.1.0-phaseB',
        'phase': 'Phase 2 - Database Integration',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'database': db_status,
        'ords': {
            'configured': False,
            'status': 'not_configured',
            'connected': False,
            'dialect': 'oracle-ords-rest',
            'message': 'ORDS Base URL not configured in environment',
        },
    }), http_code
