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

## Fix — settings' `.env` resolution (found while running the app)

Booting the app for real (not just tests) surfaced a bug: `Settings` resolved
`.env` relative to the process's current working directory, not the backend
package. Launched from the repo root, it silently found no `.env` and fell
back to the default SQLite URL — registration then 500'd with
`no such table: users` against an empty local DB the migration had never
touched. Fixed in [`app/core/config.py`](../backend/app/core/config.py) by
anchoring `env_file` to the config module's own location
(`Path(__file__).resolve().parents[2]`), so it resolves the same regardless
of the launch directory (dev server, pytest, alembic, Docker, CI).

## Phase 2 — Login

**JWT** ([`app/core/security.py`](../backend/app/core/security.py)) —
`create_access_token(subject)` via `python-jose`, `HS256`, expiry from
`settings.ACCESS_TOKEN_EXPIRE_MINUTES`. The token's `sub` claim is the
user's UUID, not their role — role and soft-delete status get checked fresh
against the DB wherever the token is decoded (Phase 3's `get_current_user`),
so a demoted or deleted user's existing token can't keep asserting stale
permissions. `decode_token` itself is still a TODO — it belongs with that
dependency, not this endpoint.

**Endpoint** — `POST /api/v1/auth/login` (public), in
[`services/auth_service.py::login`](../backend/app/services/auth_service.py):
1. Look up the user by email.
2. Verify the password (Argon2) — on failure, raise the *same* error as "no
   such user" (`InvalidCredentialsError`, 401, "Incorrect email or
   password"). Deliberately identical for both cases, so a login attempt
   can't be used to enumerate which emails are registered.
3. Check `is_deleted` — a distinct `AccountDeactivatedError` (403, "This
   account has been deactivated"), since this isn't a credentials problem
   and a legitimate user is better served knowing their account status.
4. Issue and return the JWT (`Token{access_token, token_type: "bearer"}`).

**Schemas** ([`app/schemas/auth.py`](../backend/app/schemas/auth.py)) —
`LoginRequest` (email + non-empty password, `extra="forbid"`), `Token`.

**Tests** — 8 new, 28 total passing:
- `tests/unit/test_security.py` — password hash round-trip, wrong password
  rejected, JWT carries `sub` + `exp`.
- `tests/integration/test_auth_login.py` — successful login, unknown email
  (401), wrong password (401), soft-deleted account (403, via a direct DB
  update since there's no delete endpoint yet), missing password (422).
- Live-verified against the real Neon DB by hand: registered a user, logged
  in successfully, confirmed wrong-password and unknown-email both return
  the same 401, then flipped `is_deleted` directly in Neon and confirmed
  login correctly returns 403. Test data removed afterward.

## Next up (Phase 3)

- `app/api/deps.py`: `get_current_user` (decode JWT, load user, 401 if
  invalid/expired/deleted), `require_role(*roles)`.
- Admin-only user creation (choose `admin` vs `client` — needs the guard
  above first; an unguarded version would defeat the registration security
  rule).

## Later

Profile management, paginated/filtered user listing, basic analytics,
soft-delete endpoints (per the original spec — not yet started).
