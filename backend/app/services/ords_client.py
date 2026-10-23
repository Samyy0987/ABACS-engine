import time
import json
import logging
import re
from typing import Any, Dict, List, Optional, Union
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from flask import current_app, has_app_context

logger = logging.getLogger(__name__)


class ORDSError(Exception):
    """Base exception for ORDS client operations."""
    pass


class ORDSConnectionError(ORDSError):
    """Raised when connection to ORDS REST endpoint fails or times out."""
    pass


class ORDSAuthenticationError(ORDSError):
    """Raised when ORDS credentials, OAuth token, or privileges are rejected."""
    pass


class ORDSTimeoutError(ORDSError):
    """Raised when ORDS request times out."""
    pass


class ORDSResourceNotFoundError(ORDSError):
    """Raised when requested resource is not found (404)."""
    pass


class ORDSClient:
    """
    Client for interacting with Oracle ORDS REST APIs.
    Communicates exclusively over HTTPS REST endpoints.
    Never connects directly to Oracle via python-oracledb or SQLAlchemy.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        auth_mode: str = 'none',
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        token_url: Optional[str] = None,
        basic_username: Optional[str] = None,
        basic_password: Optional[str] = None,
        bearer_token: Optional[str] = None,
        timeout: Any = (5.0, 10.0),
        max_retries: int = 1,
        session: Optional[requests.Session] = None,
    ):
        self.base_url = (base_url or '').rstrip('/')
        self.auth_mode = (auth_mode or 'none').lower()
        self._client_id = client_id
        self._client_secret = client_secret
        self.token_url = token_url
        self._basic_username = basic_username
        self._basic_password = basic_password
        self._bearer_token = bearer_token
        
        # Support tuple (connect_timeout, read_timeout) or single float/int
        if isinstance(timeout, (tuple, list)) and len(timeout) == 2:
            self.timeout = (float(timeout[0]), float(timeout[1]))
        elif isinstance(timeout, (int, float)):
            self.timeout = (float(timeout), 10.0)
        else:
            self.timeout = (5.0, 10.0)

        self.max_retries = max_retries

        # Cached OAuth2 token & expiration
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

        if session is not None:
            self._session = session
        else:
            self._session = requests.Session()
            retry_strategy = Retry(
                total=max_retries,
                backoff_factor=0.3,
                status_forcelist=[502, 503, 504],
                allowed_methods=['GET', 'HEAD', 'OPTIONS'],
            )
            adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=10, pool_maxsize=20)
            self._session.mount('https://', adapter)
            self._session.mount('http://', adapter)

    @property
    def is_configured(self) -> bool:
        """Returns True if a non-placeholder ORDS Base URL is configured."""
        if not self.base_url:
            return False
        placeholders = ['[YOUR-ORDS-BASE-URL]', 'example.com', 'placeholder']
        return not any(ph in self.base_url for ph in placeholders)

    def _get_auth_header(self) -> Dict[str, str]:
        """
        Returns the appropriate Authorization header according to auth_mode.
        Handles OAuth2 Client Credentials token caching and renewal.
        Never logs or exposes tokens or secrets.
        """
        if self.auth_mode == 'oauth2':
            if not self._client_id or not self._client_secret or not self.token_url:
                raise ORDSAuthenticationError("OAuth2 credentials or token URL not configured")
            
            # Use cached token if still valid (with 30-second margin)
            now = time.time()
            if self._access_token and now < (self._token_expires_at - 30):
                return {'Authorization': f'Bearer {self._access_token}'}

            # Fetch fresh token
            try:
                resp = self._session.post(
                    self.token_url,
                    data={'grant_type': 'client_credentials'},
                    auth=(self._client_id, self._client_secret),
                    timeout=self.timeout,
                    headers={
                        'Accept': 'application/json',
                        'User-Agent': 'EasyAccess-ABAC-Engine/1.1 (Windows NT 10.0; Win64; x64)',
                    }
                )
            except requests.exceptions.Timeout as exc:
                raise ORDSTimeoutError("OAuth token endpoint timed out") from exc
            except requests.exceptions.RequestException as exc:
                raise ORDSConnectionError("Failed to reach OAuth token endpoint") from exc

            if resp.status_code != 200:
                raise ORDSAuthenticationError(f"OAuth token exchange failed with HTTP {resp.status_code}")

            try:
                token_data = resp.json()
                self._access_token = token_data.get('access_token')
                expires_in = float(token_data.get('expires_in', 3600))
                self._token_expires_at = now + expires_in
                return {'Authorization': f'Bearer {self._access_token}'}
            except Exception as exc:
                raise ORDSAuthenticationError("Failed to parse OAuth token response") from exc

        elif self.auth_mode == 'bearer':
            if not self._bearer_token:
                raise ORDSAuthenticationError("Bearer token not configured")
            return {'Authorization': f'Bearer {self._bearer_token}'}

        elif self.auth_mode == 'basic':
            if not self._basic_username or not self._basic_password:
                raise ORDSAuthenticationError("Basic auth credentials not configured")
            import base64
            token = base64.b64encode(f"{self._basic_username}:{self._basic_password}".encode('utf-8')).decode('utf-8')
            return {'Authorization': f'Basic {token}'}

        return {}

    @staticmethod
    def _safe_body_snippet(resp: requests.Response, max_chars: int = 300) -> str:
        """Safely extracts a truncated snippet of the response body without leaking credentials."""
        try:
            raw = getattr(resp, 'text', '')
            if not isinstance(raw, str):
                return ''
            text = raw.strip()
        except Exception:
            return ''
        if not text:
            return ''
        # Redact potential sensitive fields
        sanitized = re.sub(
            r'(?i)("?(?:password|client_secret|access_token|refresh_token|bearer|authorization|token|secret)"?\s*[:=]\s*"?)[^",\s}]+("?)',
            r'\1[REDACTED]\2',
            text
        )
        single_line = ' '.join(sanitized.split())
        if len(single_line) > max_chars:
            return single_line[:max_chars] + '...'
        return single_line

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> requests.Response:
        """
        Executes an HTTP request against the ORDS API with error mapping.
        """
        if not self.is_configured:
            raise ORDSConnectionError("ORDS base URL is not configured")

        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'EasyAccess-ABAC-Engine/1.1 (Windows NT 10.0; Win64; x64)',
        }
        headers.update(self._get_auth_header())

        try:
            resp = self._session.request(
                method=method.upper(),
                url=url,
                params=params,
                json=json_data,
                headers=headers,
                timeout=self.timeout,
            )
        except requests.exceptions.Timeout as exc:
            logger.warning("Request to ORDS timed out (%s) at %s", self.timeout, url)
            raise ORDSTimeoutError(f"Request to ORDS timed out ({self.timeout}s)") from exc
        except requests.exceptions.ConnectionError as exc:
            logger.warning("Connection to ORDS server failed at %s", url)
            raise ORDSConnectionError("Connection to ORDS server failed") from exc
        except requests.exceptions.RequestException as exc:
            logger.warning("HTTP request error (%s) at %s", exc.__class__.__name__, url)
            raise ORDSConnectionError(f"HTTP request error: {exc.__class__.__name__}") from exc

        if resp.status_code in (401, 403):
            snippet = self._safe_body_snippet(resp)
            snippet_str = f": {snippet}" if snippet else ""
            logger.warning("ORDS authentication/privilege rejected (HTTP %s)%s", resp.status_code, snippet_str)
            raise ORDSAuthenticationError(f"ORDS authentication/privilege rejected (HTTP {resp.status_code}){snippet_str}")
        elif resp.status_code == 404:
            snippet = self._safe_body_snippet(resp)
            snippet_str = f": {snippet}" if snippet else ""
            logger.warning("ORDS resource not found (HTTP 404) at %s%s", url, snippet_str)
            raise ORDSResourceNotFoundError(f"ORDS resource not found (HTTP 404) at {url}{snippet_str}")
        elif resp.status_code >= 400:
            error_msg = f"ORDS returned error HTTP {resp.status_code}"
            snippet = self._safe_body_snippet(resp)
            try:
                details = resp.json()
                if isinstance(details, dict):
                    if 'error' in details and details['error']:
                        error_msg += f": {details['error']}"
                    elif 'message' in details and details['message']:
                        error_msg += f": {details['message']}"
                    elif snippet:
                        error_msg += f": {snippet}"
                elif snippet:
                    error_msg += f": {snippet}"
            except Exception:
                if snippet:
                    error_msg += f": {snippet}"
            logger.warning("ORDS request error (HTTP %s): %s", resp.status_code, snippet)
            raise ORDSError(error_msg)

        return resp

    # -------------------------------------------------------------------------
    # Health Check
    # -------------------------------------------------------------------------
    def check_health(self) -> Dict[str, Any]:
        """
        Pings ORDS health endpoint to verify HTTPS connectivity and response time.
        Never leaks passwords, tokens, or internal hostnames.
        """
        if not self.is_configured:
            return {
                'configured': False,
                'status': 'not_configured',
                'connected': False,
                'dialect': 'oracle-ords-rest',
                'message': 'ORDS Base URL not configured in environment',
            }

        start_time = time.perf_counter()
        try:
            resp = self._request('GET', 'health/ping')
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            data = resp.json() if resp.content else {}
            if isinstance(data, dict) and 'items' in data and isinstance(data['items'], list) and data['items']:
                item0 = data['items'][0]
                if isinstance(item0, dict):
                    data = {**item0, **data}

            return {
                'configured': True,
                'status': 'connected',
                'connected': True,
                'dialect': 'oracle-ords-rest',
                'latency_ms': latency_ms,
                'ords_service': data.get('service', 'oracle-ords-abac'),
                'active_policy_count': data.get('active_policy_count'),
                'message': 'Oracle ORDS REST API verified',
            }
        except ORDSTimeoutError:
            return {
                'configured': True,
                'status': 'connection_timeout',
                'connected': False,
                'dialect': 'oracle-ords-rest',
                'error': 'Connection to ORDS endpoint timed out',
            }
        except ORDSAuthenticationError:
            return {
                'configured': True,
                'status': 'authentication_failed',
                'connected': False,
                'dialect': 'oracle-ords-rest',
                'error': 'Authentication or authorization failed on ORDS endpoint',
            }
        except ORDSConnectionError:
            return {
                'configured': True,
                'status': 'connection_failed',
                'connected': False,
                'dialect': 'oracle-ords-rest',
                'error': 'Unable to establish connection to ORDS REST endpoint',
            }
        except Exception as exc:
            logger.warning("ORDS health check error: %s", exc.__class__.__name__)
            return {
                'configured': True,
                'status': 'connection_failed',
                'connected': False,
                'dialect': 'oracle-ords-rest',
                'error': 'ORDS health check failed',
            }

    # -------------------------------------------------------------------------
    # Policies CRUD
    # -------------------------------------------------------------------------
    def get_policies(
        self,
        is_enabled: Optional[bool] = None,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves ABAC policies from ORDS and normalizes JSON structures."""
        params = {}
        if is_enabled is not None:
            params['is_enabled'] = 1 if is_enabled else 0
        if category:
            params['category'] = category

        resp = self._request('GET', 'policies/', params=params)
        data = resp.json()
        items = data.get('items', []) if isinstance(data, dict) else data

        normalized = []
        for item in items:
            normalized.append(self._normalize_policy(item))
        return normalized

    def get_policy(self, policy_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single ABAC policy by ID or code."""
        try:
            resp = self._request('GET', f'policies/{policy_id}')
            data = resp.json()
            if not data:
                return None
            return self._normalize_policy(data)
        except ORDSResourceNotFoundError:
            return None

    def create_policy(self, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new ABAC policy via ORDS POST."""
        resp = self._request('POST', 'policies/', json_data=policy_data)
        return resp.json() if resp.content else {}

    def update_policy(self, policy_id: str, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Updates an ABAC policy via ORDS PUT."""
        resp = self._request('PUT', f'policies/{policy_id}', json_data=policy_data)
        return resp.json() if resp.content else {}

    def delete_policy(self, policy_id: str) -> Dict[str, Any]:
        """Deletes an ABAC policy via ORDS DELETE."""
        resp = self._request('DELETE', f'policies/{policy_id}')
        return resp.json() if resp.content else {}

    def _normalize_policy(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Converts Oracle ORDS JSON strings and NUMBER booleans to Python types."""
        policy = dict(raw)
        
        # Boolean normalization
        if 'is_enabled' in policy:
            policy['is_enabled'] = bool(policy['is_enabled'] == 1 or policy['is_enabled'] is True)

        # Actions normalization
        actions = policy.get('actions')
        if isinstance(actions, str):
            try:
                policy['actions'] = json.loads(actions)
            except Exception:
                policy['actions'] = []
        elif not isinstance(actions, list):
            policy['actions'] = []

        # Conditions normalization
        conditions = policy.get('conditions')
        if isinstance(conditions, str):
            try:
                policy['conditions'] = json.loads(conditions)
            except Exception:
                policy['conditions'] = {}
        elif not isinstance(conditions, dict):
            policy['conditions'] = {}

        return policy

    # -------------------------------------------------------------------------
    # Protected Resources CRUD
    # -------------------------------------------------------------------------
    def get_resources(
        self,
        is_active: Optional[bool] = None,
        resource_type: Optional[str] = None,
        classification: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieves protected resources from ORDS."""
        params = {}
        if is_active is not None:
            params['is_active'] = 1 if is_active else 0
        if resource_type:
            params['resource_type'] = resource_type
        if classification:
            params['classification'] = classification

        resp = self._request('GET', 'resources/', params=params)
        data = resp.json()
        items = data.get('items', []) if isinstance(data, dict) else data
        for item in items:
            if 'is_active' in item:
                item['is_active'] = bool(item['is_active'] == 1 or item['is_active'] is True)
        return items

    def get_resource(self, resource_id: str) -> Optional[Dict[str, Any]]:
        try:
            resp = self._request('GET', f'resources/{resource_id}')
            data = resp.json()
            if data and 'is_active' in data:
                data['is_active'] = bool(data['is_active'] == 1 or data['is_active'] is True)
            return data
        except ORDSResourceNotFoundError:
            return None

    def create_resource(self, resource_data: Dict[str, Any]) -> Dict[str, Any]:
        resp = self._request('POST', 'resources/', json_data=resource_data)
        return resp.json() if resp.content else {}

    def delete_resource(self, resource_id: str) -> Dict[str, Any]:
        resp = self._request('DELETE', f'resources/{resource_id}')
        return resp.json() if resp.content else {}

    # -------------------------------------------------------------------------
    # Users & Subject Attributes
    # -------------------------------------------------------------------------
    def get_users(self, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        params = {}
        if is_active is not None:
            params['is_active'] = 1 if is_active else 0
        resp = self._request('GET', 'users/', params=params)
        data = resp.json()
        return data.get('items', []) if isinstance(data, dict) else data

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            resp = self._request('GET', f'users/{user_id}')
            return resp.json()
        except ORDSResourceNotFoundError:
            return None

    def get_user_attributes(self, user_id: str) -> Dict[str, Any]:
        """Retrieves all subject attributes for a user formatted as a key-value dictionary."""
        try:
            resp = self._request('GET', f'users/{user_id}/attributes')
            data = resp.json()
            items = data.get('items', []) if isinstance(data, dict) else data
            attrs = {}
            for item in items:
                name = item.get('attribute_name')
                val = item.get('attribute_value')
                dtype = item.get('data_type', 'string')
                if dtype == 'integer':
                    try:
                        attrs[name] = int(val)
                    except ValueError:
                        attrs[name] = val
                elif dtype == 'boolean':
                    attrs[name] = str(val).lower() in ('true', '1', 'yes')
                else:
                    attrs[name] = val
            return attrs
        except ORDSResourceNotFoundError:
            return {}

    # -------------------------------------------------------------------------
    # Audit Logs (Immutable)
    # -------------------------------------------------------------------------
    def get_audit_logs(
        self,
        subject: Optional[str] = None,
        resource_key: Optional[str] = None,
        decision: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        params = {}
        if subject:
            params['subject'] = subject
        if resource_key:
            params['resource_key'] = resource_key
        if decision:
            params['decision'] = decision

        resp = self._request('GET', 'audit-logs/', params=params)
        try:
            data = resp.json() if resp.content else {}
        except Exception as exc:
            snippet = self._safe_body_snippet(resp)
            logger.warning("Failed to decode JSON from ORDS GET audit-logs: %s", snippet)
            raise ORDSError(f"ORDS returned invalid JSON response for audit logs: {snippet}") from exc

        items = data.get('items', []) if isinstance(data, dict) else data
        for item in items:
            for json_field in ('matched_policy_ids', 'context_snapshot'):
                if isinstance(item.get(json_field), str):
                    try:
                        item[json_field] = json.loads(item[json_field])
                    except Exception:
                        pass
        return items

    def create_audit_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Appends an immutable audit log entry."""
        resp = self._request('POST', 'audit-logs/', json_data=log_data)
        if not resp.content:
            return {}
        try:
            return resp.json()
        except Exception as exc:
            snippet = self._safe_body_snippet(resp)
            logger.warning("Failed to decode JSON from ORDS POST audit-logs: %s", snippet)
            raise ORDSError(f"ORDS returned invalid JSON response for audit logs: {snippet}") from exc


def get_ords_client() -> ORDSClient:
    """Factory helper to obtain an initialized ORDSClient from current Flask app config."""
    if has_app_context():
        cfg = current_app.config
        timeout_val = cfg.get('ORDS_TIMEOUT_SECONDS', 5.0)
        try:
            connect_timeout = float(timeout_val)
            timeout_setting = (connect_timeout, 10.0)
        except (ValueError, TypeError):
            timeout_setting = (5.0, 10.0)

        return ORDSClient(
            base_url=cfg.get('ORDS_BASE_URL'),
            auth_mode=cfg.get('ORDS_AUTH_MODE', 'none'),
            client_id=cfg.get('ORDS_CLIENT_ID'),
            client_secret=cfg.get('ORDS_CLIENT_SECRET'),
            token_url=cfg.get('ORDS_TOKEN_URL'),
            basic_username=cfg.get('ORDS_BASIC_USERNAME'),
            basic_password=cfg.get('ORDS_BASIC_PASSWORD'),
            bearer_token=cfg.get('ORDS_BEARER_TOKEN'),
            timeout=timeout_setting,
            max_retries=int(cfg.get('ORDS_MAX_RETRIES', 1)),
        )
    return ORDSClient()
