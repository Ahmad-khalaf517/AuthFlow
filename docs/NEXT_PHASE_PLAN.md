# AuthFlow — Next Phase Plan: CI You Can Trust

Planned: August 27, 2026
Baseline: `main` at commit `754be17`
Source document: [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)

This is the agreed scope for the phase that follows the Docker/CI work in
`4a5a6bd`. It covers the first five items of the readiness roadmap's
priority list, in a deliberately different order, and stops short of any
deployment.

## Why this phase, in this order

The roadmap's recommended order puts the frontend authentication rewrite
second, ahead of PostgreSQL integration testing and Playwright in CI. This
plan swaps that.

The auth rewrite is the riskiest change on the whole list — it moves token
storage, adds a cookie transport with its CSRF implications, adds a 401
refresh-and-retry interceptor, and adds a revocation endpoint, across both
codebases at once. End-to-end tests are precisely the thing that catches
regressions in that kind of change. Building the safety net first and then
doing the dangerous refactor costs nothing extra in total effort, and it is
the entire reason for having a safety net.

So: this phase makes CI trustworthy. The auth lifecycle is the phase after
it, and deployment the phase after that.

## Research findings

The roadmap document was written against this same commit and is accurate
on most points. Four things needed correcting before planning around it.

### 1. The Alembic SSL bug should be making CI red right now

[`alembic/env.py`](../backend/alembic/env.py) applies
`ssl.create_default_context()` to every PostgreSQL URL, ignoring
`settings.DB_SSL`:

```python
if make_url(settings.DATABASE_URL).get_backend_name() == "postgresql":
    connect_args["ssl"] = ssl.create_default_context()
```

Reading asyncpg 0.31's `connect_utils.py` confirms what that does against a
server with TLS off. An `SSLContext` instance is neither a `str`/`SSLMode`
nor `True`, so it falls through to `sslmode = SSLMode.disable` — but the
context object itself is still truthy, so the connection path at line 1092
still runs `_create_ssl_connection`, with `ssl_is_advisory` computed as
`sslmode == SSLMode.prefer`, which is `False`. When the server answers `N`
to the SSLRequest, the handler raises rather than falling back:

```
ConnectionError: PostgreSQL server at "postgres:5432" rejected SSL upgrade
```

`postgres:16-alpine` ships with SSL off. So the `migrate` service in
[docker-compose.yml](../docker-compose.yml) cannot connect,
`depends_on: condition: service_completed_successfully` never fires, `api`
never starts, and the `docker` job in
[backend-ci.yml](../.github/workflows/backend-ci.yml) fails at
`docker compose up --build -d`.

The roadmap lists that job under "What already works" *and* describes this
bug in the same document. Both cannot be true. **Confirm against the Actions
run for `4a5a6bd` / `754be17`.** This was not reproduced locally — there is
no Docker daemon on the development machine.

### 2. The refresh-token gap is frontend-only

The roadmap reads as though refresh-token rotation is unbuilt. It is fully
implemented server-side in
[`auth_service.py`](../backend/app/services/auth_service.py), including
replay detection: presenting an already-rotated refresh token bumps
`token_version` and clears `current_refresh_token_id`, killing every session
for that account. Two migrations back it (`3345993e6957`, `33f31207eacd`).

What is actually missing is two things: the frontend discards
`refresh_token` at [`authStore.ts`](../frontend/src/store/authStore.ts), and
there is no `POST /auth/logout`. That is a meaningfully smaller piece of work
than the roadmap implies — which is another reason it can safely wait a
phase.

### 3. The ten Mypy errors are two mechanical clusters

Verified by running `mypy app` against the checked-in configuration:

| Location | Count | Cause |
| --- | --- | --- |
| `api/v1/endpoints/{users,auth}.py` | 6 | Functions annotated `-> UserRead` that return the ORM `User`. Works at runtime because `UserRead` sets `from_attributes=True` and FastAPI serializes via `response_model`. |
| `crud/user.py` | 4 | `conditions` list inferred as `list[BinaryExpression[bool]]` from its first element, then appended `ColumnElement[bool]`; and `list(result.all())` returning `list[Row[...]]` where `list[tuple[str, int]]` is declared. |

Neither cluster is real type debt. Both are single-line fixes.

### 4. Two gaps the roadmap does not mention

**No backend coverage gate at all.** The roadmap lists
`--cov-fail-under` as future work, but the frontend thresholds it describes
as "enforced" are set at 80/80/80/75 in
[`vitest.config.ts`](../frontend/vitest.config.ts) while actual coverage is
roughly 93/94/91/83. Thirteen points of slack means a substantial regression
passes silently.

**There is no way to seed an admin.** The roadmap lists "seed unique admin
and client test accounts" as one bullet in the E2E job, as though it were
configuration. It is not: `register_user` hard-forces `UserRole.CLIENT`, and
`POST /users` requires an authenticated admin. Nothing in the codebase can
create the first one. A direct-database seed script has to be written.

**Housekeeping.** `PRODUCTION_READINESS.md` currently exists only as an
untracked file in the `AuthFlow-codex` worktree, which is four commits behind
`main`. It belongs in this repository. Also,
[PROGRESS.md](PROGRESS.md) has no entry for the Docker/CI phase.

## Scope

**In:** roadmap priorities 1, 2, 4 and 5, plus the coverage and artifact
items from the "additional production work" list that are cheap to do while
the workflows are already open.

**Out, deliberately:**

- The frontend auth lifecycle (roadmap priority 3) — next phase.
- All deployment, staging, and hosting configuration (priority 6) — the
  phase after.
- Security scanning, Dependabot, CodeQL, Trivy — folded into the deployment
  phase, where they gate a real release rather than nothing.

## Work items

The three items are a dependency chain, not a preference order. Item 2
cannot run `alembic upgrade head` against a CI PostgreSQL service until
item 1 fixes the SSL gating. Item 3 reuses the PostgreSQL service pattern
and the schema setup that item 2 establishes.

---

### Item 1 — Turn CI green and make it honest

Small. One pull request. Three unrelated fixes that all touch the workflow
files, so they travel together.

#### 1a. Fix the Alembic SSL gating

The bug exists because the same logic is written twice, and only one copy
was correct. Fix the drift, not just the symptom.

- Add `backend/app/db/connection.py` holding `postgres_connect_args(url,
  use_ssl)` and `postgres_pool_kwargs(...)`, with no module-level side
  effects. It must not import `session.py`, which builds an engine at import
  time — Alembic should not be constructing the application engine as a side
  effect of running a migration.
- [`db/session.py`](../backend/app/db/session.py) and
  [`alembic/env.py`](../backend/alembic/env.py) both import from it. Neither
  keeps a private copy.
- Extend [`tests/unit/test_db_session.py`](../backend/tests/unit/test_db_session.py)
  to cover all four combinations: PostgreSQL with `DB_SSL=true` returns a
  context; PostgreSQL with `DB_SSL=false` returns `{}`; SQLite returns `{}`
  either way.

**Acceptance:** the `docker` job in `backend-ci.yml` completes — `migrate`
exits zero, `api` reports healthy, `/health` returns 200 over HTTP.

#### 1b. Make Mypy blocking

- `endpoints/users.py`, `endpoints/auth.py`: change the six return
  annotations from `-> UserRead` to `-> User`. That is what the functions
  actually return; `response_model=UserRead` continues to do the
  serialization. For `list_users`, construct the response as
  `users=[UserRead.model_validate(u) for u in users]`.
- `crud/user.py`: annotate `conditions: list[ColumnElement[bool]]`
  explicitly at line 80, and change `return list(result.all())` at line 129
  to `return list(result.tuples().all())`.
- Remove `continue-on-error: true` and its explanatory comment from the
  `mypy` step.

**Acceptance:** `mypy app` reports zero errors; introducing a deliberate type
error fails the job.

#### 1c. Coverage gates and workflow hygiene

- Backend: add `--cov-fail-under=95` and `--cov-report=xml` to the pytest
  step. Current coverage is ~97%, so this leaves two points of headroom
  without being decorative.
- Frontend: ratchet the `vitest.config.ts` thresholds from 80/80/80/75 to
  91/91/89/81 — current measured coverage minus two points.
- Upload backend coverage XML and the frontend `coverage/` directory as
  artifacts.
- Add `concurrency: { group: "${{ github.workflow }}-${{ github.ref }}",
  cancel-in-progress: true }` to both workflows, so a force-push cancels the
  obsolete run instead of racing it.
- Add `workflow_dispatch:` to both workflows.
- Pin `pnpm/action-setup` to a full commit SHA. The `actions/*` uses are
  first-party and can stay on tags.

**Acceptance:** a deliberate two-point coverage drop on either side fails
CI.

---

### Item 2 — Run the backend suite against real PostgreSQL

Medium. One pull request. The riskiest part is the test-isolation rework,
not the new job.

#### Requirements

- The existing SQLite run stays exactly as it is — it is the fast gate, and
  nothing about it should get slower.
- A second run of the same suite executes against PostgreSQL 16, matching
  the version in `docker-compose.yml`.
- On PostgreSQL, the schema is built by `alembic upgrade head`, not
  `Base.metadata.create_all`. This is the point of the exercise: it is the
  only thing that proves the migration chain and the `pg_trgm` indexes in
  `599f1c2ee189` actually apply.
- Migrating from an already-deployed schema is tested, not just migrating
  from empty.

#### Changes

- [`tests/conftest.py`](../backend/tests/conftest.py): read
  `TEST_DATABASE_URL`, defaulting to `sqlite+aiosqlite:///:memory:`. Keep
  `StaticPool` and `check_same_thread` for SQLite only; use `NullPool` for
  PostgreSQL.
- Replace the autouse `_reset_db` fixture. Today it runs `create_all` /
  `drop_all` around *every* test — on PostgreSQL that is prohibitively slow
  and would also discard the Alembic-built schema. Split it:
  - Session-scoped setup: `create_all` for SQLite, `alembic upgrade head`
    for PostgreSQL.
  - Function-scoped teardown: `DELETE FROM` each table in reverse
    `Base.metadata.sorted_tables` order. Works identically on both backends.
  - Every existing test assumes a clean database, so this fixture is the one
    place a mistake here breaks the whole suite. Verify the SQLite run stays
    green and its runtime does not regress.
- New `postgres` job in `backend-ci.yml` using a `services:` PostgreSQL 16
  container with a `pg_isready` health check.
- Environment separation in that job: `TEST_DATABASE_URL` is what conftest
  reads; `DATABASE_URL` is what `alembic/env.py` reads. Set both to the
  service URL, plus `DB_SSL=false`. Keeping them as two variables avoids
  coupling the test harness to the migration harness.
- Migration checks as explicit steps:
  1. Fresh database → `alembic upgrade head` → assert `alembic current`
     matches head.
  2. Upgrade-from-deployed: fresh database → `alembic upgrade 599f1c2ee189`
     → `alembic upgrade head`. This uses the revision preceding head rather
     than a downgrade, so it exercises the real production path — an
     existing older schema being brought forward.

#### Note on defining "the previous release"

Step 2 hardcodes `599f1c2ee189` because the repository has no release tags,
so "the previously released revision" has no definition yet. Introducing
tags would let this resolve automatically. Until then the hardcoded revision
needs updating whenever a migration lands — worth a line in the migration
checklist.

**Acceptance:** all 131 backend tests pass against PostgreSQL 16; both
migration checks pass; the SQLite job is still green and still fast.

---

### Item 3 — Playwright end-to-end and accessibility tests in CI

Large. One pull request, or two if the seed script lands separately. This is
the bulk of the phase.

#### 3a. Seed script

`backend/scripts/seed_e2e.py` — the piece that does not exist today.

- Idempotent: safe to run against a database that already has the accounts.
- Reads `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` / `E2E_CLIENT_EMAIL` /
  `E2E_CLIENT_PASSWORD` from the environment.
- Inserts the admin directly via SQLAlchemy using
  `security.get_password_hash`, because no API path can create one.
- Refuses to run when `ENVIRONMENT=production` unless passed an explicit
  override flag. A seeding script that can create an admin account is
  exactly the thing that should not be one typo away from running against a
  live database.
- Passwords must satisfy the existing policy: minimum 8 characters, at least
  one letter and one digit.

#### 3b. Test account defaults

[`e2e/support/auth.ts`](../frontend/e2e/support/auth.ts) currently defaults
to `maya@gmail.com` and `ahmadkhalaf517@gmail.com` with the password
`password1`. Change the defaults to `admin@e2e.authflow.test` and
`client@e2e.authflow.test`, keeping the environment-variable overrides.
Passwords come from CI environment variables, not from source.

The `restoreSavedSession` path needs no change — `playwright/.auth/*.json`
will not exist on a fresh runner, so it returns `false` and falls through to
`signIn`.

#### 3c. Serve the production build

[`playwright.config.ts`](../frontend/playwright.config.ts) currently runs
`pnpm dev`. In CI it should serve the built `dist` instead:

- Build with `VITE_API_BASE_URL=http://localhost:8000/api/v1` set, then
  serve with `vite preview --port 5173 --strictPort`.
- This matters specifically because Vite inlines `VITE_*` variables at build
  time. The roadmap flags that as a deployment footgun; serving `dist` in CI
  is what turns the warning into a tested path.
- Keep `pnpm dev` for local runs — branch on `process.env.CI`.
- Add a `preview` port to `vite.config.ts` to match.

#### 3d. The job

New workflow `.github/workflows/e2e.yml`, because the job spans both halves
of the repository and neither existing workflow's path filter is right for
it. Triggered on push and pull request against `main` with filters covering
`backend/**`, `frontend/**` and itself, plus `workflow_dispatch`.

Steps: PostgreSQL 16 service → install backend and frontend dependencies →
`alembic upgrade head` → run the seed script → start uvicorn in the
background and wait for `/health` → `pnpm exec playwright install --with-deps
chromium` (cached on `~/.cache/ms-playwright`, keyed to the
`@playwright/test` version) → `pnpm build` → `pnpm test:e2e`.

Backend environment: `DATABASE_URL` pointing at the service, `DB_SSL=false`,
a real `SECRET_KEY`, and `BACKEND_CORS_ORIGINS` including
`http://localhost:5173`.

On failure, upload `playwright-report/` and `test-results/` — the latter
carries the traces, screenshots and videos — with a 7-day retention.

#### 3e. Suite split — not yet

The roadmap recommends a smoke subset on pull requests and the full suite
nightly. At nine specs that split costs more in tagging and workflow
duplication than the two minutes it saves. Run everything on every pull
request, and revisit when the suite passes roughly five minutes.

**Acceptance:** the E2E job is green on a pull request; deliberately breaking
a selector turns it red and uploads a usable trace.

---

## Check matrix

Where the required checks stand today, and where this phase leaves them.

| Check | Today | After |
| --- | --- | --- |
| Ruff, Black | blocking | blocking |
| Mypy | non-blocking, 10 errors | blocking, clean |
| Backend tests (SQLite) | blocking, no coverage gate | blocking, `--cov-fail-under=95` |
| Backend tests (PostgreSQL) | none | blocking |
| Migration from empty | implicit in Docker job | explicit, blocking |
| Migration from prior revision | none | blocking |
| Docker build and boot | failing | blocking, green |
| Frontend format, lint, build | blocking | blocking |
| Frontend coverage | blocking at 80/75 | blocking at 91/81 |
| Playwright E2E and a11y | local only | blocking |
| Reports as artifacts | none | coverage and Playwright traces |

## Definition of done

- Every workflow green on a pull request from a clean branch.
- Every check in the matrix above is blocking — no `continue-on-error`
  remaining anywhere.
- A deliberate regression in each of three categories is demonstrated to
  fail CI: a type error, a coverage drop, and a broken E2E selector.
  Verifying the gates actually bite is part of the work, not an optional
  extra.
- `main` protected with these checks required. This is a GitHub settings
  change, not a code change.
- [PROGRESS.md](PROGRESS.md) updated with both the Docker/CI phase, which it
  is currently missing, and this one.
- `PRODUCTION_READINESS.md` committed to this repository.

## Open items

- **Repository visibility.** Determines whether Actions minutes are free and
  unmetered, and whether CodeQL and secret scanning are available without a
  paid plan. It also decides whether a nightly full E2E run is affordable
  later. Not resolvable from the working copy — `gh` is not installed here.
- **Confirm the CI state.** The Actions run for `754be17` should show the
  `docker` job failing. If it is green, finding 1 above is wrong and item 1a
  needs re-examining before anything is built on top of it.
- **Release tagging.** Item 2's upgrade-from-prior-revision check is
  hardcoded until releases are tagged.

## After this phase

1. **Auth lifecycle** — refresh-token transport, `POST /auth/logout`,
   401 refresh-and-retry, CSRF if the cookie route is chosen. Note that a
   Cloudflare Pages frontend and a Render backend are different sites, so a
   refresh cookie there needs `SameSite=None; Secure` and real CSRF
   protection — that decision needs making at the start of that phase, not
   during it.
2. **Deployment** — staging on Render, Neon and Cloudflare Pages; security
   scanning gating the release; production behind a protected GitHub
   Environment; a rehearsed rollback.
