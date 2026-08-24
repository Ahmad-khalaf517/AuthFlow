# AuthFlow

A production-style authentication and user management REST API built with FastAPI.

## Features (planned)

- User registration and login
- JWT-based authentication (access + refresh tokens)
- Password hashing (passlib / bcrypt)
- Role-based authorization (`admin`, `client`)
- Protected and public routes
- Pydantic request/response validation
- Pagination and filtering on list endpoints
- Basic analytics (admin-only)
- User profile management
- Soft delete
- Centralized, consistent error handling
- Database integration via SQLAlchemy 2.0 (async) + Alembic migrations

## Project structure

```
AuthFlow/
├── backend/                   FastAPI application
│   ├── app/
│   │   ├── main.py            App entrypoint, middleware, router registration
│   │   ├── core/               config, security (JWT/hashing), exceptions
│   │   ├── api/
│   │   │   ├── deps.py         Shared dependencies (auth guards, role checks)
│   │   │   └── v1/endpoints/   auth, users, analytics routers
│   │   ├── models/             SQLAlchemy ORM models
│   │   ├── schemas/            Pydantic schemas
│   │   ├── crud/                Database access layer
│   │   ├── services/            Business logic
│   │   ├── middleware/          Global exception handlers
│   │   └── db/                  Engine, session, init
│   ├── alembic/                 Database migrations
│   ├── tests/
│   │   ├── unit/                 Unit tests
│   │   └── integration/          Integration tests (API, DB)
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
├── frontend/                    Reserved for a future frontend client
└── README.md
```

## Tech stack

- **FastAPI** — web framework
- **SQLAlchemy 2.0** (async) — ORM, via `asyncpg` against a hosted Postgres (Neon). `aiosqlite` is kept as a dev dependency for fast, network-free test runs
- **Alembic** — database migrations
- **Pydantic v2** / **pydantic-settings** — validation and config
- **python-jose** — JWT encoding/decoding
- **passlib[bcrypt]** — password hashing
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

Run tests:

```bash
pytest
```

Run a database migration (once models exist):

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
- [ ] Admin: paginated/filtered user listing, update-any-user, soft-delete
- [ ] Public statistics endpoints
