# AuthFlow

A production-style authentication and user management REST API built with FastAPI.

## Features

- User registration and login
- JWT-based authentication (`Authorization: Bearer <token>`)
- Password hashing (Argon2)
- Role-based authorization (`admin`, `client`) via a reusable `require_role` dependency
- Protected and public routes
- Pydantic request/response validation
- Pagination and filtering (+ search) on the user list endpoint
- Public statistics (active user count, average age, top cities)
- Self-service and admin-driven user profile management
- Soft delete
- Centralized, consistent error handling
- Database integration via SQLAlchemy 2.0 (async) + Alembic migrations
- Refresh token rotation with replay detection (`POST /api/v1/auth/refresh`)
- Rate limiting on login (brute-force protection)
- Structured JSON logging with request-ID correlation
- Security headers on every response
- CI (GitHub Actions: backend checks plus frontend format, lint, Vitest coverage, and build)
- Containerized (Dockerfile + docker-compose for local Postgres)

## Route summary

| Method | Endpoint                    | Access        | Purpose                                              |
| ------ | --------------------------- | ------------- | ---------------------------------------------------- |
| POST   | `/api/v1/auth/register`     | Public        | Register — always creates a `client`                 |
| POST   | `/api/v1/auth/login`        | Public        | Log in, receive an access + refresh token            |
| POST   | `/api/v1/auth/refresh`      | Public        | Exchange a refresh token for a new pair (rotates it) |
| GET    | `/api/v1/users/me`          | Authenticated | Get own profile                                      |
| PUT    | `/api/v1/users/me`          | Authenticated | Update own profile                                   |
| POST   | `/api/v1/users`             | Admin         | Create a `client` or `admin`                         |
| GET    | `/api/v1/users`             | Admin         | List users — paginated + filtered                    |
| PUT    | `/api/v1/users/{id}`        | Admin         | Update any user, including role                      |
| DELETE | `/api/v1/users/{id}`        | Admin         | Soft-delete a user                                   |
| GET    | `/api/v1/stats/count`       | Public        | Count of active users                                |
| GET    | `/api/v1/stats/average-age` | Public        | Average age of active users                          |
| GET    | `/api/v1/stats/top-cities`  | Public        | Top 3 cities among active users                      |

## Project structure

```
AuthFlow/
├── backend/                   FastAPI application
│   ├── app/
│   │   ├── main.py            App entrypoint, middleware, router registration
│   │   ├── core/               config, security (JWT/hashing), exceptions,
│   │   │                       rate limiting, structured logging
│   │   ├── api/
│   │   │   ├── deps.py         Shared dependencies (auth guards, role checks)
│   │   │   └── v1/endpoints/   auth, users, stats routers
│   │   ├── models/             SQLAlchemy ORM models
│   │   ├── schemas/            Pydantic schemas
│   │   ├── crud/                Database access layer
│   │   ├── services/            Business logic
│   │   ├── middleware/          Request ID, security headers, exception handlers
│   │   └── db/                  Engine, session, init
│   ├── alembic/                 Database migrations
│   ├── tests/
│   │   ├── unit/                 Unit tests
│   │   └── integration/          Integration tests (API, DB)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
├── frontend/                    React 19 + TypeScript client (Vite)
│   ├── src/
│   │   ├── main.tsx              Entry point — router, query client, error boundary
│   │   ├── App.tsx                Root layout (<Outlet /> + toaster)
│   │   ├── routes/                 router.tsx — TanStack Router route tree
│   │   ├── pages/                   Login, Register, Dashboard, Profile,
│   │   │                            UsersManagement, NotFound
│   │   ├── components/
│   │   │   ├── auth/                 LoginForm, RegisterForm, ProtectedRoute
│   │   │   ├── admin/                 UsersTable, UserDialog, StatsCards, ...
│   │   │   ├── profile/                ProfileForm, ProfileHeader
│   │   │   ├── layout/                  Header, Sidebar, MainLayout, AuthLayout
│   │   │   └── ui/                       Button, Input, Dialog, Card, Toast, ...
│   │   ├── api/                           auth.ts, users.ts, stats.ts, client.ts
│   │   │                                  (fetch wrapper — attaches the bearer
│   │   │                                  token, normalizes API errors)
│   │   ├── hooks/                          useAuth, useCurrentUser, useUsers, ...
│   │   │                                  (TanStack Query wrapping the api/ calls)
│   │   ├── store/                           authStore.ts (Zustand + persisted
│   │   │                                    JWT/user), uiStore.ts
│   │   ├── types/                            auth.ts, user.ts, stats.ts, api.ts
│   │   ├── utils/                             validation.ts (Zod schemas),
│   │   │                                      constants.ts, formatters.ts
│   │   └── lib/                                 queryClient.ts, cn.ts
│   ├── public/
│   ├── package.json                            pnpm — dev/build/lint/format
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── .env.example                            VITE_API_BASE_URL
├── .github/workflows/            Backend and frontend CI checks
├── docker-compose.yml            Local Postgres + migrate + api
└── README.md
```

## Tech stack

- **FastAPI** — web framework
- **SQLAlchemy 2.0** (async) — ORM, via `asyncpg` against a hosted Postgres (Neon). `aiosqlite` is kept as a dev dependency for fast, network-free test runs
- **Alembic** — database migrations
- **Pydantic v2** / **pydantic-settings** — validation and config
- **python-jose** — JWT encoding/decoding
- **argon2-cffi** — password hashing (Argon2, used directly — not via passlib)
- **pytest**, **pytest-asyncio**, **httpx** — testing

## Getting started

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements-dev.txt
copy .env.example .env
```

### Database (Neon Postgres)

1. Create a free project at [neon.tech](https://neon.tech) — no local Postgres
   install needed, `asyncpg` is a pure-Python driver.
2. Copy the connection string from the Neon dashboard.
3. In `backend/.env`, set `DATABASE_URL` using the `postgresql+asyncpg://`
   scheme, and **drop** the `?sslmode=require&channel_binding=require` query
   params Neon includes by default — asyncpg doesn't understand them; SSL is
   configured in code instead (`app/db/session.py`, `alembic/env.py`).

```
# Neon gives you:
postgres://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
# use instead:
DATABASE_URL=postgresql+asyncpg://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb
```

Run the API:

```bash
uvicorn app.main:app --reload
```

Then open http://localhost:8000/docs for the interactive API docs, or check
http://localhost:8000/health.

### Test accounts

Use these development-only accounts to test role-based frontend behavior:

| Role   | Email                      | Password    |
| ------ | -------------------------- | ----------- |
| Admin  | `maya@gmail.com`           | `password1` |
| Client | `ahmadkhalaf517@gmail.com` | `password1` |

These credentials are intended only for local testing and must not be used in
production.

### Docker (optional, local Postgres — no Neon needed)

```bash
docker-compose up
```

Brings up a local Postgres, runs migrations against it, then starts the
API on http://localhost:8000. Uses its own `docker-compose.yml`-provided
config (`DB_SSL=false`, since the local Postgres container doesn't have
TLS configured — Neon does and stays `DB_SSL=true`), so it doesn't touch
`backend/.env`.

Run tests:

```bash
pytest
```

Run tests with a coverage report:

```bash
pytest --cov=app --cov-report=term-missing
```

Both of the above run against an in-memory SQLite database. To run the same
suite against PostgreSQL — the only way `CREATE EXTENSION pg_trgm`, the
`gin_trgm_ops` indexes and asyncpg itself actually execute — point
`TEST_DATABASE_URL` at a throwaway database:

```bash
TEST_DATABASE_URL=postgresql+asyncpg://authflow:authflow@localhost:5432/authflow_test pytest
```

The schema is built by `alembic upgrade head` rather than `create_all`, so
this also checks that the migrations produce the schema the app expects. It
must not be the same database as `DATABASE_URL` — every test clears every
table, and the suite refuses to start if the two match.

Run a database migration (after changing a model):

```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
```

## Status

- [x] Project scaffolding (structure, config, dependency manifests, test wiring)
- [x] `User` model (soft delete, `admin`/`client` role, audit timestamps) + migration
- [x] Pydantic validation for user fields (name, email, phone, city, age, password)
- [x] `POST /api/v1/auth/register` — public, always creates a `client`, rejects any
      client-supplied `type` field outright (422), hashes passwords with Argon2,
      rejects duplicate emails (409)
- [x] `POST /api/v1/auth/login` — public, verifies password, rejects soft-deleted
      accounts (403) and bad credentials (401, same message for unknown email vs
      wrong password), returns a JWT access token
- [x] Reusable auth dependencies (`get_current_user`, `require_role`) + `GET /api/v1/users/me`
      as the first protected route — role/soft-delete state is re-checked from the DB on
      every request rather than trusted from the token
- [x] `POST /api/v1/users` — admin-only (`require_role`), lets an admin create either
      an `admin` or a `client`; non-admins get 403, unauthenticated gets 401
- [x] `PUT /api/v1/users/me` — authenticated, partial self-update; role-protected
      the same way as registration (no `type` field, `extra="forbid"`)
- [x] `GET /api/v1/users` — admin-only, `page`/`limit` pagination (validated,
      max 100/page), filter by name/email/city (partial, case-insensitive)
      and age/type (exact), all combinable; soft-deleted always excluded
- [x] `PUT /api/v1/users/{id}` — admin-only, can change any field including role; 404
      if the user doesn't exist, 409 on email conflict
- [x] `DELETE /api/v1/users/{id}` — admin-only, soft delete (`is_deleted`/`deleted_at`);
      row is never removed, but disappears from listings and can no longer log in
- [x] `GET /api/v1/stats/{count,average-age,top-cities}` — public, no auth,
      scoped to active (non-soft-deleted) users
- [x] Architecture/production-readiness audit — see [`docs/AUDIT.md`](docs/AUDIT.md).
      Fixed: password hashing was blocking the event loop, JWTs stayed valid after
      a password change, inconsistent error responses, a health check that didn't
      check anything, an unconfigurable connection pool, dead code/dependencies,
      and a coverage-measurement bug that was silently hiding real coverage
- [x] Every recommendation from the audit's "not implemented" list has since
      been built — see [`docs/AUDIT.md`](docs/AUDIT.md#recommendations-implemented):
      rate limiting on login, `pg_trgm` indexes for partial-match filters,
      refresh token rotation with replay detection, structured JSON logging
      with request-ID correlation, security headers, CI (ruff/black/mypy/pytest),
      and containerization (Dockerfile + docker-compose for local Postgres).
      Plus one gap found live-testing along the way, not on the original list:
      admins could edit or soft-delete their own account through the admin
      endpoints — now blocked (403).

Full backend spec and React frontend implemented. The backend has 131 automated
tests passing (`pytest`) with 97% coverage. The frontend has Vitest unit/integration
coverage plus nine Playwright E2E/accessibility tests covering both roles and
critical browser journeys. The frontend implements the full feature list against
the real API. See [`frontend/README.md`](frontend/README.md) for setup, test
commands, and test-layer responsibilities.
