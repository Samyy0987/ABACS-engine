from flask import Blueprint, jsonify, request
from ..services.ords_client import get_ords_client, ORDSError, ORDSResourceNotFoundError
from ..services.abac_engine import ABACDecisionEngine, AccessRequest
from ..services.audit_fallback import get_audit_fallback_store

abac_bp = Blueprint('abac', __name__, url_prefix='/api')


@abac_bp.route('/policies', methods=['GET'])
def list_policies():
    """Returns active and inactive ABAC policies from Oracle ORDS."""
    ords_client = get_ords_client()
    if not ords_client.is_configured:
        return jsonify({
            'error': 'Oracle ORDS REST API is not configured',
            'status': 'unconfigured',
        }), 503

    category = request.args.get('category')
    is_enabled_arg = request.args.get('is_enabled')
    is_enabled = None
    if is_enabled_arg is not None:
        is_enabled = is_enabled_arg.lower() in ('true', '1')

    try:
        policies = ords_client.get_policies(is_enabled=is_enabled, category=category)
        return jsonify({'policies': policies, 'count': len(policies)}), 200
    except ORDSError as exc:
        return jsonify({'error': 'Failed to fetch policies from ORDS', 'details': str(exc)}), 502


@abac_bp.route('/policies/<policy_id>', methods=['GET'])
def get_policy(policy_id):
    """Retrieves single policy by ID or code."""
    ords_client = get_ords_client()
    if not ords_client.is_configured:
        return jsonify({'error': 'Oracle ORDS REST API is not configured'}), 503

    try:
        policy = ords_client.get_policy(policy_id)
        if not policy:
            return jsonify({'error': 'Policy not found'}), 404
        return jsonify(policy), 200
    except ORDSError as exc:
        return jsonify({'error': 'Failed to retrieve policy from ORDS', 'details': str(exc)}), 502


@abac_bp.route('/policies', methods=['POST'])
def create_policy():
    """Creates a new policy via ORDS."""
    ords_client = get_ords_client()
    if not ords_client.is_configured:
        return jsonify({'error': 'Oracle ORDS REST API is not configured'}), 503

    payload = request.get_json() or {}
    if not payload.get('code') or not payload.get('name') or not payload.get('effect'):
        return jsonify({'error': 'Missing required policy fields: code, name, effect'}), 400

    try:
        res = ords_client.create_policy(payload)
        return jsonify(res), 201
    except ORDSError as exc:
        return jsonify({'error': 'Failed to create policy in ORDS', 'details': str(exc)}), 502


@abac_bp.route('/policies/<policy_id>', methods=['PUT'])
def update_policy(policy_id):
    """Updates an existing policy via ORDS."""
    ords_client = get_ords_client()
    if not ords_client.is_configured:
        return jsonify({'error': 'Oracle ORDS REST API is not configured'}), 503

    payload = request.get_json() or {}
    try:
        res = ords_client.update_policy(policy_id, payload)
        return jsonify(res), 200
    except ORDSResourceNotFoundError:
        return jsonify({'error': 'Policy not found'}), 404
    except ORDSError as exc:
        return jsonify({'error': 'Failed to update policy in ORDS', 'details': str(exc)}), 502


@abac_bp.route('/policies/<policy_id>', methods=['DELETE'])
def delete_policy(policy_id):
    """Deletes policy via ORDS."""
    ords_client = get_ords_client()
    if not ords_client.is_configured:
        return jsonify({'error': 'Oracle ORDS REST API is not configured'}), 503

    try:
        res = ords_client.delete_policy(policy_id)
        return jsonify(res), 200
    except ORDSResourceNotFoundError:
        return jsonify({'error': 'Policy not found'}), 404
    except ORDSError as exc:
        return jsonify({'error': 'Failed to delete policy in ORDS', 'details': str(exc)}), 502


@abac_bp.route('/evaluate', methods=['POST'])
def evaluate_access():
    """
    ABAC Policy Decision Point (PDP) evaluation endpoint.
    Accepts subject, resource, action, and environment attributes.
    Returns PERMIT or DENY decision and records immutable audit log in ORDS.
    """
    data = request.get_json() or {}
    subject_id = data.get('subject_identifier')
    resource_key = data.get('resource_key')
    action = data.get('action')

    if not subject_id or not resource_key or not action:
        return jsonify({
            'error': 'Missing required fields: subject_identifier, resource_key, action',
            'decision': 'DENY'
        }), 400

    access_req = AccessRequest(
        subject_identifier=subject_id,
        resource_key=resource_key,
        action=action,
        subject_attributes=data.get('subject_attributes', {}),
        resource_attributes=data.get('resource_attributes', {}),
        environment_attributes=data.get('environment_attributes', {}),
        client_ip=request.headers.get('X-Forwarded-For', request.remote_addr),
        request_id=data.get('request_id'),
    )

    engine = ABACDecisionEngine()
    result = engine.evaluate(access_req)
    return jsonify(result.to_dict()), 200


@abac_bp.route('/audit-logs', methods=['GET'])
def list_audit_logs():
    """Queries audit log records from Oracle ORDS, falling back to local SQLite if empty."""
    ords_client = get_ords_client()
    subject = request.args.get('subject')
    resource_key = request.args.get('resource_key')
    decision = request.args.get('decision')

    if not ords_client.is_configured:
        fallback_store = get_audit_fallback_store()
        local_logs = fallback_store.get_audit_logs(subject=subject, resource_key=resource_key, decision=decision)
        return jsonify({'logs': local_logs, 'count': len(local_logs)}), 200

    try:
        logs = ords_client.get_audit_logs(subject=subject, resource_key=resource_key, decision=decision)
        if not logs:
            fallback_store = get_audit_fallback_store()
            local_logs = fallback_store.get_audit_logs(subject=subject, resource_key=resource_key, decision=decision)
            if local_logs:
                return jsonify({'logs': local_logs, 'count': len(local_logs)}), 200
        return jsonify({'logs': logs, 'count': len(logs)}), 200
    except ORDSError as exc:
        fallback_store = get_audit_fallback_store()
        local_logs = fallback_store.get_audit_logs(subject=subject, resource_key=resource_key, decision=decision)
        if local_logs:
            return jsonify({'logs': local_logs, 'count': len(local_logs)}), 200
        return jsonify({'error': 'Failed to retrieve audit logs from ORDS', 'details': str(exc)}), 502


@abac_bp.route('/resources', methods=['GET'])
def list_resources():
    """Returns protected enterprise resources from Oracle ORDS."""
    ords_client = get_ords_client()
    if not ords_client.is_configured:
        return jsonify({
            'error': 'Oracle ORDS REST API is not configured',
            'status': 'unconfigured',
        }), 503

    is_active_arg = request.args.get('is_active')
    is_active = None
    if is_active_arg is not None:
        is_active = is_active_arg.lower() in ('true', '1')
    resource_type = request.args.get('resource_type')
    classification = request.args.get('classification')

    try:
        resources = ords_client.get_resources(
            is_active=is_active,
            resource_type=resource_type,
            classification=classification
        )
        return jsonify({'resources': resources, 'count': len(resources)}), 200
    except ORDSError as exc:
        return jsonify({'error': 'Failed to fetch resources from ORDS', 'details': str(exc)}), 502


@abac_bp.route('/users', methods=['GET'])
def list_users():
    """Returns user identity directory records from Oracle ORDS."""
    ords_client = get_ords_client()
    if not ords_client.is_configured:
        return jsonify({
            'error': 'Oracle ORDS REST API is not configured',
            'status': 'unconfigured',
        }), 503

    is_active_arg = request.args.get('is_active')
    is_active = None
    if is_active_arg is not None:
        is_active = is_active_arg.lower() in ('true', '1')

    try:
        users = ords_client.get_users(is_active=is_active)
        return jsonify({'users': users, 'count': len(users)}), 200
    except ORDSError as exc:
        return jsonify({'error': 'Failed to fetch users from ORDS', 'details': str(exc)}), 502

