# AuthFlow — Progress Log

A running record of what's been built, phase by phase. For a plainer-English
walkthrough of the same material, see the published write-up (linked from the
project chat) — this file is the terser, developer-facing version meant to
live alongside the code.

## Phase 0 — Project setup

Established the repo skeleton with no feature logic yet:

- `backend/app/` split into `core` (settings, security), `models` (DB
  tables), `schemas` (API input/output shapes), `crud` (DB access), `services`
  (business rules), `api` (routes), `db` (engine/session), `middleware`
  (error handling).
- `backend/alembic/` for database migrations; `backend/tests/{unit,integration}`
  for automated tests.
- `frontend/` reserved, empty.
- Stack: FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, pytest +
  pytest-asyncio + httpx.
- Database: PostgreSQL hosted on Neon, via the `asyncpg` driver. Note —
  asyncpg's SQLAlchemy dialect doesn't understand libpq-style `sslmode` /
  `channel_binding` URL params (raises `TypeError`); SSL is instead
  configured via `connect_args` in [`app/db/session.py`](../backend/app/db/session.py)
  and [`alembic/env.py`](../backend/alembic/env.py).
- Verified: app boots, test suite passes, live connection to Neon confirmed.

Commit: `c09680f`.

## Phase 1 — User model, validation, and registration

**Model** ([`app/models/user.py`](../backend/app/models/user.py)) — `User`
table: UUID primary key (avoids sequential-ID enumeration), `first_name`,
`last_name`, `email` (unique), `phone_number`, `city`, `age`, `type`
(`admin`/`client` native enum, defaults `client`), `hashed_password`,
`is_deleted` + `deleted_at` (soft delete), `created_at`/`updated_at`
(server-side timestamps).

**Validation** ([`app/schemas/user.py`](../backend/app/schemas/user.py)) —
`UserCreate`: non-blank names/city, `EmailStr` format, phone regex
(`^\+?[1-9]\d{7,14}$`), age `1–120`, password min 8 chars with at least one
letter and one digit. `model_config = ConfigDict(extra="forbid")` — the
schema has no `type` field at all, and any extra field (including a
client-supplied `type`) causes the whole request to be rejected with 422
rather than silently dropped.

**Password hashing** ([`app/core/security.py`](../backend/app/core/security.py))
— Argon2 via `argon2-cffi` directly (not passlib — it's effectively
unmaintained and its argon2 wrapper throws a deprecation warning against
current argon2-cffi).

**Endpoint** — `POST /api/v1/auth/register` (public):
1. Validate payload (Pydantic, before any DB access).
2. Check for duplicate email (`crud/user.py::get_by_email`).
3. Hash the password (Argon2).
4. Insert with `type` forced to `UserRole.CLIENT` server-side
   (`services/auth_service.py::register_user`) — the role is never read from
   client input.
5. On `IntegrityError` from the DB's unique constraint (race condition
   between step 2's check and the insert), roll back and raise
   `DuplicateEmailError` → `409`.
6. Return the created user via `UserRead` (no password fields).

**Error handling** — `AppError` base class +
`DuplicateEmailError(409)` in [`app/core/exceptions.py`](../backend/app/core/exceptions.py),
translated to JSON in [`app/middleware/error_handler.py`](../backend/app/middleware/error_handler.py).

**Migration** — `alembic/versions/0789e411cd49_create_users_table.py`,
generated against and applied to the real Neon DB. `downgrade()` explicitly
drops the Postgres `user_role` enum type (auto-created by `create_table` but
not reversed by `drop_table`) so `upgrade()` can be re-run cleanly.

**Tests** — 20 passing:
- `tests/unit/test_user_schemas.py` — schema validation in isolation (blank
  fields, bad email/phone/age, weak passwords, rejected `type`).
- `tests/integration/test_auth_register.py` — full endpoint behavior
  (success, duplicate email, injected `type`, missing field), against an
  isolated in-memory SQLite DB (`tests/conftest.py`) so tests never touch the
  real Neon instance.
- Additionally live-tested by hand against the real Neon database: a real
  registration, and a real role-injection attempt confirmed rejected; the
  test row was deleted afterward.

Commit: `1f7d82f`.

## Next up (Phase 2)

- Login endpoint + JWT issuance (`app/core/security.py` JWT helpers are
  stubbed, not yet implemented).
- `app/api/deps.py` auth dependencies: `get_current_user`,
  `get_current_active_user`, `require_role(*roles)`.
- Admin-only user creation (choose `admin` vs `client` — requires the role
  guard above to exist first; deliberately not built early, since an
  unguarded version of this endpoint would defeat the registration
  security rule).

## Later

Profile management, paginated/filtered user listing, basic analytics,
soft-delete endpoints (per the original spec — not yet started).
