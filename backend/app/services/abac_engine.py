import time
import uuid
import logging
import ipaddress
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from .ords_client import ORDSClient, ORDSError, get_ords_client
from .audit_fallback import AuditFallbackStore, get_audit_fallback_store

logger = logging.getLogger(__name__)

# Sensitive keys that must NEVER be written to audit logs
REDACTED_KEYS = {
    'password', 'password_hash', 'secret', 'client_secret', 'token',
    'access_token', 'refresh_token', 'authorization', 'bearer', 'api_key'
}


@dataclass
class AccessRequest:
    """Incoming authorization evaluation request."""
    subject_identifier: str
    resource_key: str
    action: str
    subject_attributes: Dict[str, Any] = field(default_factory=dict)
    resource_attributes: Dict[str, Any] = field(default_factory=dict)
    environment_attributes: Dict[str, Any] = field(default_factory=dict)
    client_ip: Optional[str] = None
    request_id: Optional[str] = None


@dataclass
class EvaluationResult:
    """Outcome of an ABAC evaluation by the Policy Decision Point (PDP)."""
    decision: str  # 'PERMIT' or 'DENY'
    request_id: str
    subject_identifier: str
    resource_key: str
    action: str
    matched_policies: List[str] = field(default_factory=list)
    reason: str = ''
    evaluation_duration_ms: float = 0.0
    audit_logged: bool = False
    audit_storage: str = 'none'  # 'oracle_ords', 'local_sqlite', or 'none'

    def to_dict(self) -> Dict[str, Any]:
        return {
            'decision': self.decision,
            'request_id': self.request_id,
            'subject_identifier': self.subject_identifier,
            'resource_key': self.resource_key,
            'action': self.action,
            'matched_policies': self.matched_policies,
            'reason': self.reason,
            'evaluation_duration_ms': self.evaluation_duration_ms,
            'audit_logged': self.audit_logged,
            'audit_storage': self.audit_storage,
        }


class ABACDecisionEngine:
    """
    Attribute-Based Access Control Policy Decision Point (PDP).
    Evaluates access requests against security policies retrieved from Oracle ORDS.
    Enforces 'Default Deny' whenever policies cannot be retrieved or evaluated.
    """

    def __init__(
        self,
        ords_client: Optional[ORDSClient] = None,
        fallback_store: Optional[AuditFallbackStore] = None,
    ):
        self._ords_client = ords_client
        self._fallback_store = fallback_store

    @property
    def ords_client(self) -> ORDSClient:
        if self._ords_client is not None:
            return self._ords_client
        return get_ords_client()

    @property
    def fallback_store(self) -> AuditFallbackStore:
        if self._fallback_store is not None:
            return self._fallback_store
        return get_audit_fallback_store()

    def evaluate(self, request: AccessRequest) -> EvaluationResult:
        """
        Evaluates an access request against active security policies.
        Default outcome is strictly DENY.
        """
        start_time = time.perf_counter()
        req_id = request.request_id or str(uuid.uuid4())
        normalized_action = request.action.upper().strip()

        # 1. Fetch active policies from ORDS Policy Information Point
        try:
            policies = self.ords_client.get_policies(is_enabled=True)
        except (ORDSError, Exception) as exc:
            logger.error("Failed to fetch policies from ORDS (Default Deny applied): %s", exc.__class__.__name__)
            duration = round((time.perf_counter() - start_time) * 1000, 2)
            result = EvaluationResult(
                decision='DENY',
                request_id=req_id,
                subject_identifier=request.subject_identifier,
                resource_key=request.resource_key,
                action=normalized_action,
                matched_policies=[],
                reason='Policy Information Point unavailable: default deny enforced',
                evaluation_duration_ms=duration,
            )
            self._record_audit_log(request, result)
            return result

        # 2. Evaluate candidate policies
        matched_permits: List[str] = []
        matched_denies: List[str] = []

        # Sort policies by priority (ascending, lower number = higher precedence)
        sorted_policies = sorted(policies, key=lambda p: p.get('priority', 999))

        for policy in sorted_policies:
            if not policy.get('is_enabled', True):
                continue

            policy_code = policy.get('code', policy.get('id', 'unknown'))
            policy_actions = [a.upper().strip() for a in policy.get('actions', [])]

            # Check action match (wildcard '*' or explicit action)
            if '*' not in policy_actions and normalized_action not in policy_actions:
                continue

            # Evaluate policy conditions
            conditions = policy.get('conditions', {})
            if self._matches_conditions(conditions, request):
                effect = policy.get('effect', 'DENY').upper()
                if effect == 'DENY':
                    matched_denies.append(policy_code)
                elif effect == 'PERMIT':
                    matched_permits.append(policy_code)

        duration = round((time.perf_counter() - start_time) * 1000, 2)

        # 3. Decision Combining Algorithm: Deny-Overrides
        if matched_denies:
            decision = 'DENY'
            matched = matched_denies
            reason = f"Explicitly denied by policy: {', '.join(matched_denies)}"
        elif matched_permits:
            decision = 'PERMIT'
            matched = matched_permits
            reason = f"Permitted by policy: {', '.join(matched_permits)}"
        else:
            decision = 'DENY'
            matched = []
            reason = 'No matching policy found: default deny enforced'

        result = EvaluationResult(
            decision=decision,
            request_id=req_id,
            subject_identifier=request.subject_identifier,
            resource_key=request.resource_key,
            action=normalized_action,
            matched_policies=matched,
            reason=reason,
            evaluation_duration_ms=duration,
        )

        # 4. Record audit log
        self._record_audit_log(request, result)
        return result

    def _matches_conditions(self, conditions: Dict[str, Any], request: AccessRequest) -> bool:
        """
        Evaluates condition dictionary against request attributes.
        Requires all specified conditions (Subject, Resource, Environment) to match.
        """
        if not conditions:
            return True

        # Subject conditions
        subj_conds = conditions.get('subject', {})
        if not self._evaluate_attribute_block(subj_conds, request.subject_attributes):
            return False

        # Resource conditions
        res_conds = conditions.get('resource', {})
        if not self._evaluate_attribute_block(res_conds, request.resource_attributes):
            return False

        # Environment conditions
        env_conds = conditions.get('environment', {})
        if not self._evaluate_attribute_block(env_conds, request.environment_attributes):
            return False

        return True

    def _evaluate_attribute_block(self, rules: Dict[str, Any], attributes: Dict[str, Any]) -> bool:
        """Helper to match a dictionary of rule constraints against supplied attributes."""
        for key, expected_value in rules.items():
            actual_value = attributes.get(key)
            if actual_value is None:
                return False

            # If rule expectation is a list (e.g. role in ['SecOps', 'Admin'])
            if isinstance(expected_value, list):
                if isinstance(actual_value, list):
                    # Any intersection
                    if not any(item in expected_value for item in actual_value):
                        return False
                else:
                    if actual_value not in expected_value:
                        return False
            # Boolean match
            elif isinstance(expected_value, bool):
                if bool(actual_value) != expected_value:
                    return False
            # String or numerical comparison
            else:
                str_actual = str(actual_value).strip().lower()
                str_expected = str(expected_value).strip().lower()

                if str_actual == str_expected:
                    continue

                # CIDR / IP Network check for network and IP constraints
                if '/' in str(expected_value) or key in ('ipRange', 'ip_range', 'client_ip', 'ip'):
                    try:
                        net = ipaddress.ip_network(str(expected_value).strip(), strict=False)
                        ip = ipaddress.ip_address(str(actual_value).strip())
                        if ip in net:
                            continue
                    except (ValueError, TypeError):
                        pass

                # Clearance Level comparison (e.g. Level 3+ or hierarchy)
                if key in ('clearanceLevel', 'clearance_level', 'clearance'):
                    # Hierarchy mapping
                    clearance_ranks = {
                        'public': 1,
                        'internal': 2,
                        'level 1': 2,
                        'level 2': 3,
                        'confidential': 4,
                        'level 3': 4,
                        'level 3+': 4,
                        'restricted': 5,
                        'level 4': 5,
                        'secret': 5,
                        'topsecret': 6,
                        'top secret': 6,
                    }
                    actual_rank = clearance_ranks.get(str_actual)
                    expected_rank = clearance_ranks.get(str_expected)
                    if actual_rank is not None and expected_rank is not None and actual_rank >= expected_rank:
                        continue

                return False

        return True

    def _record_audit_log(self, request: AccessRequest, result: EvaluationResult) -> None:
        """
        Safely records an immutable audit log entry.
        Primary target: Oracle ORDS REST API.
        Fallback target: Local SQLite database if ORDS write fails or is unavailable.
        Strips passwords, secrets, and auth tokens from the snapshot.
        """
        sanitized_context = {
            'subject': self._sanitize_dict(request.subject_attributes),
            'resource': self._sanitize_dict(request.resource_attributes),
            'environment': self._sanitize_dict(request.environment_attributes),
        }

        audit_entry = {
            'id': str(uuid.uuid4()),
            'request_id': result.request_id,
            'subject_identifier': result.subject_identifier,
            'resource_key': result.resource_key,
            'action': result.action,
            'decision': result.decision,
            'matched_policy_ids': result.matched_policies,
            'context_snapshot': sanitized_context,
            'evaluation_duration_ms': result.evaluation_duration_ms,
            'client_ip': request.client_ip or '',
        }

        # 1. Attempt primary write to Oracle ORDS
        try:
            self.ords_client.create_audit_log(audit_entry)
            result.audit_logged = True
            result.audit_storage = 'oracle_ords'
            return
        except Exception as ords_exc:
            logger.warning(
                "Primary ORDS audit logging unavailable (%s); engaging local SQLite fallback.",
                ords_exc.__class__.__name__
            )

        # 2. Engage local SQLite fallback
        try:
            fallback_store = self.fallback_store
            if fallback_store is not None and fallback_store.save_audit_log(audit_entry):
                result.audit_logged = True
                result.audit_storage = 'local_sqlite'
            else:
                result.audit_logged = False
                result.audit_storage = 'none'
        except Exception as local_exc:
            logger.warning(
                "Local SQLite audit logging fallback failed: %s",
                local_exc.__class__.__name__
            )
            result.audit_logged = False
            result.audit_storage = 'none'

    @staticmethod
    def _sanitize_dict(d: Dict[str, Any]) -> Dict[str, Any]:
        """Redacts sensitive credentials from dictionary before logging."""
        sanitized = {}
        for k, v in d.items():
            if any(secret_term in k.lower() for secret_term in REDACTED_KEYS):
                sanitized[k] = '[REDACTED]'
            elif isinstance(v, dict):
                sanitized[k] = ABACDecisionEngine._sanitize_dict(v)
            else:
                sanitized[k] = v
        return sanitized
