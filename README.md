# ABAC Engine for Enterprise Applications (EasyAccess)

[![Phase](https://img.shields.io/badge/Phase-2%20Supabase%20PostgreSQL%20Integration-7C3AED.svg)](.)
[![Backend](https://img.shields.io/badge/Backend-Python%20Flask%20%2B%20SQLAlchemy-blue.svg)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TS-61DAFB.svg)](frontend/)
[![Theme](https://img.shields.io/badge/Design-EasyAccess%20Dark%20Navy%2FPurple-8B5CF6.svg)](.)
[![Tests](https://img.shields.io/badge/Tests-15%20Passed-10B981.svg)](.)

A high-performance Attribute-Based Access Control (ABAC) engine built for enterprise microservices, zero-trust architectures, and fine-grained data authorization.

---

## Visual Design Reference & Aesthetics
The application implements the **EasyAccess Security Policies** design system:
- **Outer Frame**: Pitch dark black outer background (`#080911` / `#0A0C18`).
- **Application Surface**: Deep navy/purple surface (`#0F1222` / `#121528`).
- **Left Sidebar**: Fixed sidebar with EasyAccess logo, status indicators, and navigation.
- **Brand Accent**: Purple accent (`#7C3AED` / `#8B5CF6`) for primary buttons, active tabs, and glows.
- **Card Aesthetics**: Rounded dark cards with subtle purple borders and muted secondary text.
- **Action Controls**: Green enabled-state toggles (`#10B981`), blue edit icons (`#3B82F6`), and red delete icons (`#EF4444`).

---

## Phase Status Summary

### Phase 1: Foundation & UI Shell (Complete)
- [x] Full-stack monorepo project structure (Frontend & Backend).
- [x] React + Vite + TypeScript + Tailwind CSS configured and compiling with **0 errors and 0 warnings**.
- [x] Flask backend with CORS and environment variable support.
- [x] Responsive application shell with fixed EasyAccess sidebar, sticky header, and real-time backend health polling.
- [x] Security Policies view with category tabs, search, status filters, effect filters, metrics bar, green enabled switches, rule inspector, and session mock modals.

### Phase 2: Supabase PostgreSQL Database Integration (Complete)
- [x] SQLAlchemy configured with resilient connection pooling (`pool_pre_ping`, `pool_recycle`).
- [x] Comprehensive connection URL scheme normalization (`postgresql://`, `postgresql+psycopg://`, `postgres://`).
- [x] Production-ready PostgreSQL drivers installed: `psycopg` (v3 binary) and `psycopg2-binary`.
- [x] Modular SQLAlchemy models implemented:
  - `User`: Account credentials, active status, salted password hashing via Werkzeug (no plaintext).
  - `UserAttribute`: Subject attributes (department, clearance_level, roles, MFA status).
  - `ProtectedResource`: Resources with classification tiers (Public, Internal, Confidential, Restricted, Top Secret) and ownership.
  - `ResourceAttribute`: Resource-specific attributes.
  - `Policy`: Structured ABAC policies storing multi-dimensional conditions in native PostgreSQL `JSONB` with SQLite fallback.
  - `AccessAuditLog`: Immutable audit trail with request correlation ID, evaluation duration, and context snapshots.
- [x] Version-controlled schema migrations generated with **Flask-Migrate / Alembic** under `backend/migrations/`.
- [x] Safe schema initialization CLI command (`flask --app app:create_app init-db`) that never drops or overwrites existing tables.
- [x] Health check endpoint (`GET /api/health`) updated to perform safe, lightweight connectivity checks without leaking database credentials or hostnames.
- [x] 15 Pytest unit tests passing (models, password hashing security, constraints, cascade deletion, URL normalization, connectivity checks, and credential redaction).
- [x] Git security: `.env` strictly ignored by `.gitignore`; `.env.example` safe templates provided.

---

## Directory Structure

```
abac-enterprise-engine/
├── .env.example                  # Root environment template
├── .gitignore                    # Root gitignore protecting secrets & venvs
├── README.md                     # Project documentation & runbook
├── backend/                      # Python Flask Backend
│   ├── app/
│   │   ├── __init__.py           # Flask application factory with CORS, DB, and CLI
│   │   ├── config.py             # Environment configuration & URL normalizer
│   │   ├── database.py           # SQLAlchemy, Migrate, JSONBType & safe connectivity check
│   │   ├── models/               # Modular SQLAlchemy entities
│   │   │   ├── __init__.py
│   │   │   ├── user.py           # User & UserAttribute models
│   │   │   ├── resource.py       # ProtectedResource & ResourceAttribute models
│   │   │   ├── policy.py         # Policy model with JSONB conditions
│   │   │   └── audit.py          # AccessAuditLog model
│   │   └── routes/
│   │       ├── __init__.py
│   │       └── health.py         # GET /api/health safe endpoint
│   ├── migrations/               # Alembic version-controlled migrations
│   │   └── versions/
│   │       └── b7da2afb2682_initial_abac_schema.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_models.py        # Model validation, password hashing, and constraints
│   │   ├── test_database.py      # URL normalization & credential redaction tests
│   │   └── test_health.py        # Health endpoint state tests
│   ├── .env.example              # Safe backend environment template
│   ├── .gitignore                # Backend-specific ignore
│   ├── requirements.txt          # Dependencies (Flask, SQLAlchemy, psycopg, pytest, etc.)
│   └── run.py                    # Backend server entrypoint
└── frontend/                     # React + Vite + TypeScript Frontend
    ├── src/
    │   ├── components/
    │   │   ├── common/           # Reusable UI primitives (Badge, Switch, ActionModal)
    │   │   ├── layout/           # AppShell, Sidebar, Header
    │   │   └── policies/         # PolicyCard, PolicyFilters, PolicyMetrics
    │   ├── data/
    │   │   └── mockPolicies.ts   # Realistic enterprise ABAC mock policies
    │   ├── pages/
    │   │   ├── SecurityPoliciesPage.tsx  # Main EasyAccess Security Policies page
    │   │   └── PlaceholderPage.tsx       # Placeholder views for other tabs
    │   ├── types/
    │   │   └── policy.ts         # TypeScript ABAC interfaces & types
    │   ├── App.tsx               # Main routing / tab state container
    │   ├── main.tsx              # React DOM entrypoint
    │   └── index.css             # Tailwind base directives and theme styles
    ├── index.html                # HTML entrypoint with Inter font & shield favicon
    ├── package.json
    ├── tailwind.config.js        # EasyAccess dark navy/purple color tokens
    ├── postcss.config.js
    ├── tsconfig.json
    └── .env.example              # Frontend environment template
```

---

## Quickstart Guide (Windows PowerShell)

Open two separate PowerShell terminal windows.

### Terminal 1: Backend Setup & Execution

```powershell
# Navigate to the repository root
cd d:\Edrawsoft\abac-enterprise-engine

# Activate virtual environment
.\backend\.venv\Scripts\Activate.ps1

# Run the Pytest test suite (15 tests verifying models & safe health checks)
$env:PYTHONPATH="backend"
pytest backend\tests -v

# (Optional) Apply version-controlled database migrations
flask --app "app:create_app()" db upgrade --directory backend/migrations

# Start the Flask backend server
python backend\run.py
```

Verify backend health in PowerShell:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" | ConvertTo-Json -Depth 5
```

When `DATABASE_URL` is unconfigured:
```json
{
  "database": {
    "configured": false,
    "connected": false,
    "message": "Database URL not configured in environment",
    "status": "not_configured"
  },
  "phase": "Phase 2 - Database Integration",
  "service": "abac-enterprise-engine",
  "status": "healthy",
  "timestamp": "2026-10-18T10:39:50.081140+00:00",
  "version": "1.0.0-phase2"
}
```

---

### Terminal 2: Frontend Setup & Execution

```powershell
cd d:\Edrawsoft\abac-enterprise-engine\frontend

# Start Vite development server
npm run dev
```

Open: **`http://127.0.0.1:5173`**

---

## Supabase PostgreSQL Configuration Guide

To connect a live Supabase PostgreSQL database:

1. Copy `backend/.env.example` to `backend/.env` (which is strictly ignored by Git):
   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```
2. Retrieve your connection string from the Supabase Project Dashboard (`Project Settings -> Database -> Connection string`):
   - **Direct connection**: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`
   - **Transaction pooler**: `postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
3. Set the variable in `backend/.env`:
   ```ini
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
4. Run migrations to create tables and indexes on Supabase:
   ```powershell
   $env:PYTHONPATH="backend"
   flask --app "app:create_app()" db upgrade --directory backend/migrations
   ```
5. Check `http://127.0.0.1:5000/api/health` to confirm `status: "connected"` and `latency_ms`.

---

## Security Guarantees
- **No Plaintext Passwords**: User passwords are encrypted with salted hashes using `werkzeug.security`. Short passwords (<8 characters) are rejected.
- **Zero Secret Exposure**: Database connection strings, credentials, and raw SQL errors are never returned in API payloads or error responses.
- **TLS Verification Preserved**: Standard TLS/SSL verification is kept intact when connecting to cloud databases.
- **No Hardcoded Accounts**: Production databases remain untouched until migrations and real accounts are configured.
