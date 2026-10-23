# Oracle APEX / ORDS Provisioning Guide for EasyAccess ABAC Engine

This directory contains version-controlled, idempotent SQL and PL/SQL scripts to provision the Oracle schema and ORDS REST endpoints for the ABAC Enterprise Engine.

---

## 1. Script Inventory

| Script | Purpose | Execution Location |
| :--- | :--- | :--- |
| [`01_create_abac_tables.sql`](file:///d:/Edrawsoft/abac-enterprise-engine/backend/sql/01_create_abac_tables.sql) | Creates all 6 ABAC tables (`ABAC_USERS`, `ABAC_USER_ATTRIBUTES`, `ABAC_PROTECTED_RESOURCES`, `ABAC_RESOURCE_ATTRIBUTES`, `ABAC_POLICIES`, `ABAC_ACCESS_AUDIT_LOGS`), indexes, check constraints (`IS JSON`), and seed policies. | Oracle APEX SQL Workshop -> SQL Commands / SQL Scripts |
| [`02_create_ords_module.sql`](file:///d:/Edrawsoft/abac-enterprise-engine/backend/sql/02_create_ords_module.sql) | Enables schema for ORDS, defines REST module `abac/v1/`, templates, and handlers with safe bind variables (`GET`, `POST`, `PUT`, `DELETE`). | Oracle APEX SQL Workshop -> SQL Commands / SQL Scripts |
| [`03_create_ords_security.sql`](file:///d:/Edrawsoft/abac-enterprise-engine/backend/sql/03_create_ords_security.sql) | Creates ORDS role `abac_api_role`, privilege `abac_api_privilege`, and registers OAuth2 client credentials for the Flask backend. | Oracle APEX SQL Workshop -> SQL Commands |

---

## 2. Step-by-Step Oracle APEX Execution Instructions

### Step 1: Run Table DDL & Seed Data
1. Log in to your Oracle APEX Workspace.
2. Navigate to **SQL Workshop** -> **SQL Scripts**.
3. Click **Upload**, select [`01_create_abac_tables.sql`](file:///d:/Edrawsoft/abac-enterprise-engine/backend/sql/01_create_abac_tables.sql), and click **Run**.
4. Verify all 6 tables and 3 default seed policies are created without errors.

### Step 2: Define ORDS REST Module
1. Navigate to **SQL Workshop** -> **SQL Scripts** (or **SQL Commands**).
2. Upload or paste [`02_create_ords_module.sql`](file:///d:/Edrawsoft/abac-enterprise-engine/backend/sql/02_create_ords_module.sql) and execute it.
3. Verify the module in APEX:
   - Go to **SQL Workshop** -> **RESTful Services**.
   - Confirm module `abac.v1` appears under Modules with base path `abac/v1/`.

### Step 3: Configure Security & Authentication (OAuth2 or Development)
Depending on your APEX environment permissions:
- **Production Mode (OAuth2 Client Credentials)**:
  Run [`03_create_ords_security.sql`](file:///d:/Edrawsoft/abac-enterprise-engine/backend/sql/03_create_ords_security.sql) in SQL Commands. Retrieve the generated `client_id` and `client_secret` from `USER_ORDS_CLIENTS`.
- **Development / Direct Mode**:
  If using IP-restricted or internal gateway access without OAuth2, keep `ORDS_AUTH_MODE=none` in `backend/.env`.

---

## 3. Backend Configuration (`backend/.env`)

Once the ORDS module is registered in Oracle APEX, configure the following variables in `backend/.env`:

```env
# Oracle ORDS REST Module Base URL
ORDS_BASE_URL=https://<your-apex-host>/ords/<your-schema>/abac/v1

# Authentication Mode ('none', 'oauth2', 'bearer', or 'basic')
ORDS_AUTH_MODE=oauth2

# If ORDS_AUTH_MODE=oauth2:
ORDS_CLIENT_ID=<your-client-id>
ORDS_CLIENT_SECRET=<your-client-secret>
ORDS_TOKEN_URL=https://<your-apex-host>/ords/<your-schema>/oauth/token

# Timeout and connection parameters
ORDS_TIMEOUT_SECONDS=5.0
ORDS_MAX_RETRIES=2
```

---

## 4. Verification

After saving `backend/.env`:
1. Check backend health via:
   ```bash
   curl http://127.0.0.1:5000/api/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "phase": "Phase 2 - Oracle APEX/ORDS Integration",
     "ords": {
       "configured": true,
       "connected": true,
       "dialect": "oracle-ords-rest",
       "active_policy_count": 3
     }
   }
   ```
2. Verify policy retrieval:
   ```bash
   curl http://127.0.0.1:5000/api/policies
   ```
3. Run the complete automated test suite:
   ```bash
   backend\.venv\Scripts\pytest backend\tests
   ```
