import urllib.request
import json
import time

URL = 'http://127.0.0.1:5000/api/evaluate'

scenarios = [
    {
        'name': '1. PERMIT Candidate: Alice (SecOps) on K8s cluster alpha (pol-001)',
        'payload': {
            'request_id': 'live-test-permit-001',
            'subject_identifier': 'test_alice_secops',
            'resource_key': 'test-k8s-cluster-alpha',
            'action': 'READ',
            'subject_attributes': {
                'role': 'SecOps',
                'clearanceLevel': 'TopSecret',
                'mfaEnforced': True,
                'department': 'Security'
            },
            'resource_attributes': {
                'classification': 'Critical',
                'type': 'Cluster_Node',
                'environment': 'staging-test'
            },
            'environment_attributes': {
                'ipRange': '10.240.0.0/16'
            }
        }
    },
    {
        'name': '2. DENY Candidate: Bob (Guest) on Prod DB',
        'payload': {
            'request_id': 'live-test-deny-002',
            'subject_identifier': 'test_bob_guest',
            'resource_key': 'test-prod-db-primary',
            'action': 'READ',
            'subject_attributes': {
                'role': 'Guest',
                'clearanceLevel': 'Public',
                'mfaEnforced': False
            },
            'resource_attributes': {
                'classification': 'Production_Database',
                'type': 'Relational_Database'
            },
            'environment_attributes': {
                'ipRange': '192.168.1.50'
            }
        }
    },
    {
        'name': '3. Default-Deny: Unknown subject and unmatched resource',
        'payload': {
            'request_id': 'live-test-default-deny-003',
            'subject_identifier': 'unknown_ext_subject',
            'resource_key': 'unregistered-legacy-system',
            'action': 'EXECUTE',
            'subject_attributes': {
                'role': 'Anonymous'
            },
            'resource_attributes': {
                'classification': 'Unclassified'
            },
            'environment_attributes': {}
        }
    },
    {
        'name': '4. Deny-Overrides: Alice on Prod DB DELETE matching pol-003',
        'payload': {
            'request_id': 'live-test-deny-overrides-004',
            'subject_identifier': 'test_alice_secops',
            'resource_key': 'test-prod-db-primary',
            'action': 'DELETE',
            'subject_attributes': {
                'role': 'SecOps',
                'clearanceLevel': 'TopSecret',
                'mfaEnforced': True,
                'department': 'Security'
            },
            'resource_attributes': {
                'classification': 'Production_Database',
                'type': 'Relational_Database'
            },
            'environment_attributes': {
                'allowedHours': '08:00 - 18:00 UTC',
                'enforceChangeWindow': True
            }
        }
    },
    {
        'name': '5. CIDR Limitation Check: Host IP 10.240.0.10 vs Policy CIDR 10.240.0.0/16',
        'payload': {
            'request_id': 'live-test-cidr-limit-005',
            'subject_identifier': 'test_alice_secops',
            'resource_key': 'test-k8s-cluster-alpha',
            'action': 'READ',
            'subject_attributes': {
                'role': 'SecOps',
                'clearanceLevel': 'TopSecret',
                'mfaEnforced': True,
                'department': 'Security'
            },
            'resource_attributes': {
                'classification': 'Critical',
                'type': 'Cluster_Node',
                'environment': 'staging-test'
            },
            'environment_attributes': {
                'ipRange': '10.240.0.10'
            }
        }
    }
]

for sc in scenarios:
    print('='*75)
    print(sc['name'])
    data_bytes = json.dumps(sc['payload']).encode('utf-8')
    req = urllib.request.Request(URL, data=data_bytes, headers={'Content-Type': 'application/json'})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            elapsed = round((time.time() - t0) * 1000, 2)
            status = resp.status
            body = json.loads(resp.read().decode('utf-8'))
            print(f"HTTP Status:       {status} (Total roundtrip: {elapsed}ms)")
            print(f"Decision:          {body.get('decision')}")
            print(f"Matched Policies:  {body.get('matched_policies')}")
            print(f"Reason:            {body.get('reason')}")
            print(f"PDP Duration:      {body.get('evaluation_duration_ms')}ms")
            print(f"Audit Logged:      {body.get('audit_logged')}")
    except Exception as exc:
        print(f"ERROR: {type(exc).__name__}: {exc}")
