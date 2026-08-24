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

## Phase 3 — Reusable authentication & authorization

**`decode_token`** ([`app/core/security.py`](../backend/app/core/security.py))
— the counterpart to `create_access_token`: decodes a JWT and returns its
subject, raising `jose.JWTError` (covers expired and bad-signature tokens,
both subclass it) on anything invalid.

**`get_current_user`** ([`app/api/deps.py`](../backend/app/api/deps.py)) —
*authentication*: extracts the bearer token (`HTTPBearer`, `auto_error=False`
so a missing header goes through our own `NotAuthenticatedError` instead of
FastAPI's default error shape), decodes it, and loads the user fresh from
the DB by id. Trusts nothing else from the token — role and `is_deleted` are
read from the DB on every call, not baked into the token at login time (see
Phase 2's note on this). Missing/invalid/expired token or unknown user id →
401; token decodes fine but the account is soft-deleted → 403
(`AccountDeactivatedError`, reused from login).

**`require_role(*roles)`** ([`app/api/deps.py`](../backend/app/api/deps.py))
— *authorization*: a dependency factory wrapping `get_current_user`. If the
authenticated user's `type` isn't in the allowed set, 403
(`PermissionDeniedError`). Usage: `Depends(require_role(UserRole.ADMIN))`.

**First protected route** — `GET /api/v1/users/me`
([`app/api/v1/endpoints/users.py`](../backend/app/api/v1/endpoints/users.py)),
gated by `get_current_user` alone (any authenticated role), returns the
caller's own profile. Exists specifically to prove the dependency chain
works end-to-end; `PUT /me` and the rest of user management are still TODO.

**Tests** — 11 new, 39 total passing:
- `tests/unit/test_security.py` — `decode_token` round-trips, rejects
  expired and bad-signature tokens.
- `tests/integration/test_users_me.py` — valid token succeeds; missing,
  malformed, and expired tokens all 401; a token for an account that got
  soft-deleted *after* the token was issued correctly 403s (proves the
  "re-check the DB, don't trust the token" design actually holds).
- `tests/integration/test_require_role.py` — since no admin-only production
  endpoint exists yet, this mounts a throwaway `/api/v1/_test/admin-only`
  route directly on the app (test-file-only; never touches the real app when
  run via uvicorn) to exercise `require_role` in isolation: wrong role → 403,
  matching role → 200, no auth at all → 401. The "matching role" case
  promotes the user to admin *after* login, using the same
  already-issued token — passing confirms role really is re-checked
  per-request rather than trusted from token claims.
- Live-verified against the real Neon DB: register → login → `GET /me` with
  the token (200, correct profile), no token (401), garbage token (401).
  Test data removed afterward.

## Phase 4 — Admin user creation

**`POST /api/v1/users`** ([`app/api/v1/endpoints/users.py`](../backend/app/api/v1/endpoints/users.py))
— gated by `dependencies=[Depends(require_role(UserRole.ADMIN))]` at the
route level (the handler itself doesn't need the admin's identity, just the
guard, so it's not taken as a function parameter). Unlike public
registration, the caller explicitly chooses `type` — that's only safe
because an unauthenticated or non-admin caller can never reach this
function in the first place; `create_user_as_admin` itself does no role
re-checking, the route already did it.

**Schema** ([`app/schemas/user.py`](../backend/app/schemas/user.py)) —
`UserCreateByAdmin(UserCreate)` adds a required `type: UserRole` field on
top of everything `UserCreate` already validates (names, email, phone, age,
password strength, `extra="forbid"`).

**Service** ([`app/services/user_service.py`](../backend/app/services/user_service.py))
— `create_user_as_admin`: duplicate-email check, hash password, insert with
the caller-supplied `type`. Deliberately *not* factored into a shared helper
with `auth_service.register_user` despite the near-identical shape — each
function's role-handling (hardcoded `client` vs. trusted caller input) stays
plainly visible top-to-bottom rather than hidden behind a shared parameter.

**Tests** — 6 new, 45 total passing (`tests/integration/test_admin_create_user.py`):
admin creates an admin (201), admin creates a client (201), a `client` role
gets 403, no auth gets 401, duplicate email gets 409, omitting `type` gets
422 (it's required here, unlike public registration where it's forbidden).

Live-verified against the real Neon DB end-to-end: registered a user
(comes in as `client`), confirmed that user gets 403 from `POST /users` and
an anonymous request gets 401; promoted the same user to admin directly in
Neon; logged in again and successfully created both a new admin and a new
client. Test rows removed afterward.

## Phase 5 — Client profile self-update

**`PUT /api/v1/users/me`** ([`app/api/v1/endpoints/users.py`](../backend/app/api/v1/endpoints/users.py))
— authenticated, partial update. `UserUpdate`
([`app/schemas/user.py`](../backend/app/schemas/user.py)) has every field
optional and, like `UserCreate`, no `type` field at all plus
`extra="forbid"` — a client attempting `{"type": "admin"}` gets a flat 422,
same defense as public registration.

Field validators (`_not_blank`, `_valid_phone`, `_valid_password`) got
pulled out to module-level functions so `UserBase`'s required-field
validators and `UserUpdate`'s optional-field validators share the actual
rule instead of copy-pasting the regex checks.

**Service** ([`app/services/user_service.py::update_own_profile`](../backend/app/services/user_service.py))
— reads only the fields the caller actually sent via
`user_in.model_dump(exclude_unset=True)` (not `is not None`, since none of
these fields are meant to ever be nulled out — omission means "leave
alone," not "clear"). Duplicate-email check excludes the caller's own
current row (`existing.id != current_user.id`), so resubmitting your own
unchanged email doesn't false-positive as a conflict. Password gets
re-hashed only if present in the update.

**`crud/user.py::update`** — generic partial-update helper (`setattr` per
field, commit, same `IntegrityError → DuplicateEmailError` race-condition
guard as `create`). `updated_at` refreshes automatically via the model's
`onupdate=func.now()`.

**Tests** — 7 new, 52 total passing (`tests/integration/test_users_me_update.py`):
partial field update, password change followed by old-password-fails/
new-password-succeeds login, role-change attempt (422) confirmed not
applied, duplicate email (409), resubmitting own email (200, not a
conflict), invalid data (422), unauthenticated (401).

## Phase 6 — Admin: list users (pagination + filtering)

**`GET /api/v1/users`** ([`app/api/v1/endpoints/users.py`](../backend/app/api/v1/endpoints/users.py))
— admin-only, `page`/`limit` as native FastAPI `Query(...)` params
(`page: ge=1`, `limit: ge=1, le=100`), invalid values 422 automatically.
Optional filters: `first_name`, `last_name`, `email`, `city` (case-insensitive
partial match — covers both "filter by city" and "search by name" with one
mechanism), `age`, `type` (exact match — a partial match on a number or enum
doesn't mean anything). All filters combine with AND. Soft-deleted users are
always excluded, unconditionally — the spec allows an optional admin view of
deleted users but doesn't require one, so I didn't add a toggle for it.

**`crud/user.py::list_paginated`** — builds the filter conditions once,
runs a `count()` query and a `limit/offset` query against the same
conditions, returns `(rows, total)`. `total_pages = ceil(total / limit)`,
0 when there are no matches (not 1) — computed in the endpoint, not stored.

**Schema** — `UserListResponse` (`page`, `limit`, `total`, `total_pages`,
`users`), matching the spec's example shape exactly.

**Tests** — 13 new, 65 total passing (`tests/integration/test_admin_list_users.py`):
client/anonymous blocked (403/401), full unfiltered list, pagination splits
correctly across pages with no overlap/gaps, `page=0` and `limit=101` both
422, each filter individually (city, type, age, partial+case-insensitive
first_name), combined filters, filters + pagination together, and a
soft-deleted user confirmed absent from the listing.

## Phase 7 — Admin: update & soft-delete any user

**`PUT /api/v1/users/{user_id}`** — admin-only, `UserAdminUpdate`
([`app/schemas/user.py`](../backend/app/schemas/user.py)) extends
`UserUpdate` with an optional `type`, the one difference from a client's
self-update: an admin *can* change a role through this endpoint. 404
(`UserNotFoundError`, new in `core/exceptions.py`) if the id doesn't exist;
409 if the new email collides with a different user; password re-hashed
only if present, same as self-update.

**`DELETE /api/v1/users/{user_id}`** — admin-only, soft delete
(`crud/user.py::soft_delete`: sets `is_deleted=True`,
`deleted_at=datetime.now(UTC)`, never removes the row). Returns the updated
user (`is_deleted: true` confirms it took effect) rather than 204, so the
caller doesn't need a separate GET to verify. 404 if the id doesn't exist.

Both routes reuse `get_by_id` (unfiltered by `is_deleted`) for the lookup —
a 404 means "never existed," not "is soft-deleted." An admin can still
update a soft-deleted user's record directly by id (the record remains
fully addressable), it just won't show up in `GET /users`' listing.

**Tests** — 11 new, 76 total passing (`tests/integration/test_admin_update_delete_user.py`):
field update, role change both directions (client→admin, admin→client),
duplicate email (409), unknown id (404) for both PUT and DELETE, a client
blocked from modifying *another* user (403 — the "client attempting to
modify another user" authorization case), unauthenticated (401), soft
delete confirmed via a direct DB read (row still present, `is_deleted` and
`deleted_at` both set), and the deleted user simultaneously disappearing
from `GET /users` and being unable to log in.

## Phase 8 — Public statistics

**`GET /api/v1/stats/count`**, **`/average-age`**, **`/top-cities`**
([`app/api/v1/endpoints/stats.py`](../backend/app/api/v1/endpoints/stats.py))
— no authentication (no `require_role`/`get_current_user` dependency at
all). All three are scoped to active users (`is_deleted = False`) via the
same three aggregate queries in
[`crud/user.py`](../backend/app/crud/user.py): `count_active`,
`average_age_active` (rounds to 2dp; returns `0.0` rather than dividing by
zero when there are no active users, since `AVG()` over zero rows is SQL
`NULL`), `top_cities_active` (`GROUP BY city ORDER BY count DESC LIMIT 3`).

This replaces the original scaffold's `analytics.py` stub (which had
guessed at admin-only `/analytics/users/summary`-style routes before the
real spec for this part existed) — deleted rather than left dangling
alongside the real thing, and the router registration swapped from
`/analytics` to the spec's actual `/stats` prefix.

**Schemas** — new [`app/schemas/stats.py`](../backend/app/schemas/stats.py):
`UserCountResponse`, `AverageAgeResponse`, `CityCount` + `TopCitiesResponse`
— shapes match the spec's examples exactly (`{"total_users": N}`,
`{"average_age": N}`, `{"cities": [{"city", "count"}, ...]}`).

**Tests** — 8 new, 84 total passing (`tests/integration/test_stats.py`):
all three endpoints reachable with zero auth headers; each one's zero-users
edge case (0, 0.0, empty list — none of them error); count, average, and
top-cities all confirmed to exclude a soft-deleted user from their figures;
top-cities capped at 3 and ordered most-common-first.

Also re-verified the app still boots and every route resolves correctly
after removing `analytics.py` — checked via `app.openapi()['paths']` rather
than `app.routes` directly, since included sub-router routes don't expose a
plain `.path` attribute the same way top-level routes do.

## Phase 9 — Testing completeness pass + full live verification

No new code. Two things: checked the automated suite against every item in
the spec's testing checklist, and ran one comprehensive live pass against
the real Neon database covering the entire flow in sequence.

**Coverage check** — every item maps to an existing test, no gaps found:

| Area | Covered by |
|---|---|
| Registration (success, invalid email/phone/age, empty names, duplicate, `type=admin` attempt, always-`client`) | `test_auth_register.py`, `test_user_schemas.py` |
| Login (success, wrong password, unknown email, soft-deleted) | `test_auth_login.py` |
| Authentication (no/invalid/expired JWT) | `test_users_me.py` |
| Authorization (admin OK, client blocked, client can't modify another user, client can't change own role) | `test_require_role.py`, `test_admin_create_user.py`, `test_admin_update_delete_user.py`, `test_users_me_update.py` |
| Client profile (get, update, update password, role-change attempt) | `test_users_me.py`, `test_users_me_update.py` |
| Admin user management (create client/admin, list, pagination, filtering, combined, update, role change, soft-delete) | `test_admin_create_user.py`, `test_admin_list_users.py`, `test_admin_update_delete_user.py` |
| Soft delete (excluded from listing, blocked from login, excluded from stats, row still in DB) | `test_admin_update_delete_user.py`, `test_auth_login.py`, `test_stats.py` |
| Statistics (count, average age, top 3 cities) | `test_stats.py` |

**Live end-to-end run against Neon** (20 checks, one continuous flow, all
passing): register admin candidate and a client → registration blocks a
`type=admin` injection attempt (422) → client logs in, views their own
profile, is blocked from `GET /users` (403) and from changing their own
role (422), updates their own city → the account is promoted to admin
directly in Neon and logs in again → admin creates a client and an admin →
filters the list by city, paginates with `limit=2`, combines `type` +
`city` filters → promotes the new client to admin via `PUT /users/{id}` →
soft-deletes the new admin via `DELETE /users/{id}` → confirms they're
gone from the listing and can no longer log in (403) → `PUT` on a
nonexistent id returns 404 → public `/stats/count` and `/stats/top-cities`
both reachable with zero auth headers and reflect the current state.

One real finding, not a code bug: a stray row (`user@example.com`, city
`Tyre`) turned up in Neon, left over from much earlier in this session — my
per-session cleanup had missed it. `/stats/count` and `/stats/top-cities`
were both correctly including it, which is exactly the behavior you'd want
from a stats endpoint; the fix was cleaning up the row, not the code. All
test data (the stray row included) has been deleted — the `users` table in
Neon is empty as of this commit.

## Phase 10 — Architecture & production-readiness audit

Full senior-level review of the codebase as it stood after Phase 9:
structure, performance, memory/resource handling, dependency hygiene, test
coverage. Full write-up in [`docs/AUDIT.md`](AUDIT.md); summary of what
came out of it, across four commits (`1cb9ecb` → `db38433`):

- **Performance**: password hashing was blocking the entire event loop —
  Argon2 is deliberately expensive, and it was being called synchronously
  from `async def` handlers, stalling every other in-flight request for
  the duration. Measured 428ms worst-case delay to an unrelated request
  before the fix, 22ms after wrapping it in `asyncio.to_thread`.
- **Security**: a password change didn't invalidate previously issued
  JWTs — a stolen token stayed valid until natural expiry even after the
  legitimate user changed their password. Fixed with a `token_version`
  column, bumped on password change, embedded in and checked against the
  token.
- **Reliability**: added a catch-all exception handler (unhandled
  exceptions were falling through to Starlette's plain-text default,
  inconsistent with every other error response), made `/health` actually
  check the database instead of returning a hardcoded response, made the
  connection pool configurable, added a shutdown hook to dispose it
  cleanly, and made the app refuse to start with the default `SECRET_KEY`
  outside of development.
- **Hygiene**: removed three dead stub files, two unused dependencies, and
  one dead config setting. Wired up `pytest-cov` (installed but never
  invoked) and in the process found coverage.py was silently
  under-reporting everything downstream of an `await db.execute(...)` call
  due to an untraced greenlet-switch gap — real coverage is 96%, not the
  ~86% the unfixed config showed.

## Status

All 24 spec sections implemented: registration, login, JWT auth,
role-based authorization, admin user creation, client self-service
profile, admin user management (list/update/soft-delete) with pagination +
filtering, public statistics, and centralized error handling, plus the
Phase 10 hardening above. 95 automated tests passing, 96% coverage, plus
live verification against the real Neon database after every phase. Not
implemented (documented in `docs/AUDIT.md`, out of scope, not attempted):
a frontend, JWT refresh tokens, rate limiting, structured/observability
logging, security headers middleware, trigram indexes for the partial-match
filters, CI, and containerization.
