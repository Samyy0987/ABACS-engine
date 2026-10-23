import os
import tempfile
import pytest
from unittest.mock import MagicMock
from app.services.ords_client import ORDSClient, ORDSAuthenticationError, ORDSError
from app.services.abac_engine import ABACDecisionEngine, AccessRequest
from app.services.audit_fallback import AuditFallbackStore
from app import create_app


@pytest.fixture
def mock_ords_client():
    client = MagicMock(spec=ORDSClient)
    client.get_policies.return_value = []
    return client


@pytest.fixture
def memory_audit_store():
    store = AuditFallbackStore(db_path=':memory:')
    yield store
    store.close()


def test_oracle_audit_success(mock_ords_client, memory_audit_store):
    """When Oracle ORDS audit POST succeeds, report audit_logged=True and audit_storage='oracle_ords'."""
    mock_ords_client.create_audit_log.return_value = {'status': 'logged', 'id': 'oracle-123'}
    engine = ABACDecisionEngine(ords_client=mock_ords_client, fallback_store=memory_audit_store)

    req = AccessRequest(
        subject_identifier='alice',
        resource_key='k8s-cluster',
        action='READ',
    )
    result = engine.evaluate(req)

    assert result.audit_logged is True
    assert result.audit_storage == 'oracle_ords'
    mock_ords_client.create_audit_log.assert_called_once()
    # Verify local SQLite was NOT written to (avoiding duplicates)
    assert memory_audit_store.count_audit_logs() == 0


def test_oracle_failure_with_sqlite_fallback_success(mock_ords_client, memory_audit_store):
    """When Oracle ORDS POST fails (e.g. HTTP 403), audit entry is saved to local SQLite."""
    mock_ords_client.create_audit_log.side_effect = ORDSAuthenticationError("HTTP 403 Forbidden")
    engine = ABACDecisionEngine(ords_client=mock_ords_client, fallback_store=memory_audit_store)

    req = AccessRequest(
        subject_identifier='alice_secops',
        resource_key='k8s-cluster-alpha',
        action='READ',
        subject_attributes={'role': 'SecOps'},
        resource_attributes={'classification': 'Critical'},
        environment_attributes={'ipRange': '10.240.0.0/16'},
    )
    result = engine.evaluate(req)

    assert result.audit_logged is True
    assert result.audit_storage == 'local_sqlite'
    mock_ords_client.create_audit_log.assert_called_once()

    # Verify record exists in SQLite store
    assert memory_audit_store.count_audit_logs() == 1
    logs = memory_audit_store.get_audit_logs(subject='alice_secops')
    assert len(logs) == 1
    assert logs[0]['subject_identifier'] == 'alice_secops'
    assert logs[0]['resource_key'] == 'k8s-cluster-alpha'
    assert logs[0]['decision'] == result.decision


def test_both_oracle_and_sqlite_failing(mock_ords_client):
    """When both Oracle and SQLite fail, audit_logged is False, audit_storage is 'none', and evaluation does not crash."""
    mock_ords_client.create_audit_log.side_effect = ORDSError("Network timeout")
    mock_fallback = MagicMock()
    mock_fallback.save_audit_log.return_value = False

    engine = ABACDecisionEngine(ords_client=mock_ords_client, fallback_store=mock_fallback)
    req = AccessRequest(
        subject_identifier='bob_guest',
        resource_key='db-prod',
        action='DELETE',
    )
    result = engine.evaluate(req)

    assert result.decision == 'DENY'
    assert result.audit_logged is False
    assert result.audit_storage == 'none'
    mock_ords_client.create_audit_log.assert_called_once()
    mock_fallback.save_audit_log.assert_called_once()


def test_sqlite_persistence_across_restarts():
    """Verify that records saved in the SQLite fallback store persist across store re-instantiations (simulating Flask restarts)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, 'persistent_audit.db')

        # 1. Initialize first instance and save audit record
        store1 = AuditFallbackStore(db_path=db_path)
        entry = {
            'id': 'audit-persist-001',
            'request_id': 'req-persist-001',
            'subject_identifier': 'persisted_user',
            'resource_key': 'persistent_res',
            'action': 'READ',
            'decision': 'PERMIT',
            'matched_policy_ids': ['pol-001'],
            'context_snapshot': {'subject': {'role': 'Admin'}},
            'evaluation_duration_ms': 5.2,
            'client_ip': '127.0.0.1',
        }
        saved = store1.save_audit_log(entry)
        assert saved is True
        assert store1.count_audit_logs() == 1
        store1.close()

        # 2. Simulate server restart by creating a new store instance pointing to the same file
        store2 = AuditFallbackStore(db_path=db_path)
        assert store2.count_audit_logs() == 1
        logs = store2.get_audit_logs(subject='persisted_user')
        assert len(logs) == 1
        assert logs[0]['id'] == 'audit-persist-001'
        assert logs[0]['request_id'] == 'req-persist-001'
        assert logs[0]['decision'] == 'PERMIT'
        assert logs[0]['matched_policy_ids'] == ['pol-001']
        assert logs[0]['context_snapshot'] == {'subject': {'role': 'Admin'}}
        store2.close()


def test_sqlite_idempotency_no_duplicate_records():
    """Verify that retrying the exact same audit entry does not insert duplicate rows."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, 'idempotent_audit.db')
        store = AuditFallbackStore(db_path=db_path)

        entry = {
            'id': 'audit-idempotent-001',
            'request_id': 'req-idempotent-001',
            'subject_identifier': 'idempotent_user',
            'resource_key': 'k8s-node',
            'action': 'UPDATE',
            'decision': 'DENY',
        }

        # First insert
        res1 = store.save_audit_log(entry)
        assert res1 is True
        assert store.count_audit_logs() == 1

        # Second insert with identical ID and request_id (retry)
        res2 = store.save_audit_log(entry)
        assert res2 is True
        assert store.count_audit_logs() == 1  # Still 1, no duplicate!

        store.close()


def test_evaluate_route_integration_with_fallback():
    """Test full Flask /api/evaluate route returns audit_storage field."""
    app = create_app('testing')
    with app.test_client() as client:
        resp = client.post('/api/evaluate', json={
            'subject_identifier': 'test_user',
            'resource_key': 'test_res',
            'action': 'READ',
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'decision' in data
        assert 'audit_logged' in data
        assert 'audit_storage' in data
        assert data['audit_storage'] in ('oracle_ords', 'local_sqlite', 'none')
