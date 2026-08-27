# AuthFlow Production Readiness and CI/CD Roadmap

Last reviewed: August 27, 2026  
Audited branch: `main` at commit `754be17`

> Hosting plans and free-tier limits change over time. Recheck the linked official documentation before deploying.

## Current status

AuthFlow has a strong CI and automated-testing foundation, but it is not yet ready for fully automated production deployment.

### What already works

- Backend CI runs formatting, linting, type checking, and tests.
- Backend CI builds the Docker image and starts the complete PostgreSQL, migration, and API stack with Docker Compose.
- Backend CI waits for the API container health check and smoke-tests `/health` over HTTP.
- Frontend CI runs formatting, linting, Vitest coverage, and a production build.
- Frontend coverage thresholds are enforced.
- Playwright end-to-end and accessibility tests exist.
- The backend has a non-root Docker image with a container `HEALTHCHECK`.
- Database migrations are kept separate from application startup.
- The health endpoint performs a real database check.
- Husky and lint-staged run ESLint and Prettier on staged frontend files before a commit.
- No tracked `.env`, private key, or certificate was found during the audit.

### Test health at the time of the audit

- Backend: 131 tests passing, approximately 97% coverage.
- Frontend: 84 unit and integration tests passing.
- Frontend coverage: approximately 93% statements, 83% branches, 91% functions, and 94% lines.
- Playwright: 9 tests passed locally.
- Ruff and Black pass.
- Mypy reports 10 errors and is currently non-blocking in CI.

## Highest-priority work

### 1. Run Playwright in CI

The frontend CI currently stops after the production build. It does not install Chromium, start the backend, create a PostgreSQL database, or run `pnpm test:e2e`.

Add a separate E2E job that:

1. Starts PostgreSQL as a GitHub Actions service.
2. Installs backend and frontend dependencies.
3. Runs `alembic upgrade head`.
4. Seeds unique admin and client test accounts.
5. Starts the backend.
6. Installs Chromium with `pnpm exec playwright install --with-deps chromium`.
7. Runs `pnpm test:e2e`.
8. Uploads Playwright reports, screenshots, traces, and videos when tests fail.

Run a small smoke E2E suite on every pull request. Run the complete suite nightly and before production deployment.

### 2. Fix the Alembic SSL inconsistency

The regular database engine respects `DB_SSL`, but the Alembic environment enables SSL for every PostgreSQL connection, regardless of `DB_SSL`.

This conflicts with Docker Compose, which sets `DB_SSL=false` for the local PostgreSQL container. As a result, automated migrations can fail against a local non-TLS PostgreSQL server.

Update the Alembic connection logic so SSL is enabled only when:

```python
database_is_postgresql and settings.DB_SSL
```

Fix this before automating deployments.

### 3. Complete the frontend authentication lifecycle

The backend returns both an access token and a refresh token. The frontend only recognizes and stores the access token, discarding the refresh token.

Current consequences:

- The user is logged out when the 30-minute access token expires.
- Backend refresh-token rotation is not being used.
- Logout only clears browser state.
- The backend logout endpoint is still a TODO.

For production authentication:

- Store the refresh token in a `Secure`, `HttpOnly`, `SameSite` cookie.
- Keep the short-lived access token in memory where practical.
- Automatically refresh and retry an authorized request after a 401 response.
- Add a backend logout/revocation endpoint.
- Add CSRF protection if cookie-based authentication is used.
- Avoid storing long-lived bearer tokens in `localStorage` because an XSS vulnerability could expose them.

### 4. Make Mypy blocking

The backend workflow currently uses `continue-on-error: true` for Mypy. CI can therefore be green even while type checking fails.

Fix the 10 current errors, remove `continue-on-error`, and make type-checking failures block pull requests and deployments.

### 5. Expand PostgreSQL testing

Main now has a useful Docker CI job that starts PostgreSQL, applies Alembic migrations, starts the API, waits for the container to become healthy, and requests `/health` over real HTTP.

This validates the basic build-and-boot path. However, the full backend test suite still uses SQLite. SQLite tests are fast and should remain part of the suite, but they do not fully validate:

- Application behavior against PostgreSQL.
- PostgreSQL extensions and search behavior beyond successful startup.
- Asyncpg and SSL behavior.
- PostgreSQL-specific SQL behavior.
- Production connection-pool behavior.
- Upgrades from previously deployed database revisions.

Extend the existing Docker/PostgreSQL job to run the backend integration tests against PostgreSQL. Also test both a fresh database migration and an upgrade from the previously released schema revision.

### 6. Add continuous deployment

The repository currently has CI workflows but no complete CD system.

The repository still needs:

- Deployment workflows.
- A staging environment.
- A protected production environment.
- Deployment configuration or infrastructure-as-code.
- A migration release job.
- Post-deployment smoke tests.
- A documented rollback procedure.

CI checks the code. CD delivers checked code to a hosting environment. AuthFlow currently has CI, but not full CD.

## Additional production work

Complete these items after the highest-priority blockers:

- Enforce backend coverage with `pytest --cov-fail-under=<threshold>`.
- Generate a locked Python dependency file instead of relying only on broad `>=` requirements.
- Add Dependabot or Renovate.
- Add dependency auditing with `pip-audit` and OSV or an equivalent service.
- Add GitHub CodeQL analysis.
- Enable repository secret scanning.
- Scan the backend container image with Trivy or an equivalent scanner.
- Upload coverage and test reports as GitHub Actions artifacts.
- Add GitHub Actions `concurrency` settings to cancel obsolete runs.
- Add `workflow_dispatch` so CI and deployment workflows can be started manually.
- Pin third-party GitHub Actions to full commit SHAs.
- Add separate `/live` and `/ready` endpoints.
- Add error tracking, such as Sentry.
- Add external uptime monitoring and deployment alerts.
- Create and test database backup and restore procedures.
- Add a frontend SPA fallback so refreshing `/dashboard` does not return a 404.
- Add a frontend Content Security Policy and other static-site security headers.
- Decide whether Swagger/OpenAPI documentation should be publicly accessible in production.
- Replace the in-memory rate limiter with Redis or gateway-level rate limiting before running multiple backend instances.
- Protect `main` with required CI checks and at least one review before merging.
- Ensure future deployment-related root files trigger all relevant workflows. The backend workflow already watches `docker-compose.yml` on `main`.

## Local developer automation already on main

The frontend uses Husky and lint-staged as a local pre-commit quality check:

- Staged TypeScript and TSX files run ESLint with automatic fixes and Prettier.
- Staged JavaScript, JSON, CSS, HTML, Markdown, and YAML files run Prettier.

These checks improve developer feedback, but they do not replace CI. Hooks can be skipped or may not be installed on every machine, so GitHub Actions must remain the authoritative quality gate.

## Recommended free hosting stack

The recommended free stack for a portfolio, demo, or learning deployment is:

| Component | Recommended service | Reason |
| --- | --- | --- |
| React/Vite frontend | Cloudflare Pages | Static hosting, custom domains, preview deployments, and GitHub Actions support |
| FastAPI backend | Render Web Service | Straightforward deployment using the existing backend Dockerfile |
| PostgreSQL | Neon | Compatible with the current application and usable for a small free deployment |
| CI/CD orchestration | GitHub Actions | The project already has GitHub Actions CI workflows |

### Cloudflare Pages

Cloudflare Pages is the recommended frontend host. Its free plan currently supports 500 builds per month and unlimited active preview deployments. Cloudflare also documents deploying prebuilt assets from GitHub Actions.

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Deploy Cloudflare Pages with continuous integration](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)

The frontend deployment will need:

- Project root: `frontend`
- Build command: `pnpm build`
- Output directory: `dist`
- Production `VITE_API_BASE_URL`
- SPA fallback configuration
- Static security headers, including a Content Security Policy

Remember that Vite environment variables are embedded at build time. `VITE_API_BASE_URL` must therefore be configured before the production build runs.

### Render

Render is the simplest free backend option for the current FastAPI Dockerfile. It integrates directly with GitHub and can deploy pushes automatically.

However, Render explicitly warns that free instances should not be used for production applications. Free services sleep after inactivity, have cold starts, use limited resources, and cannot provide normal production availability guarantees.

- [Render GitHub integration](https://render.com/docs/github)
- [Render free-tier limitations](https://render.com/docs/free)

Use Render Free for learning, portfolios, demos, and staging. Use a paid instance or another paid production platform when uptime and predictable performance matter.

### Neon

Neon Free currently includes 100 compute-unit hours and 0.5 GB of storage per project, with scale-to-zero behavior. Neon describes this tier as suitable for prototypes, side projects, and small teams rather than production-grade workloads.

- [Neon plans](https://neon.com/docs/introduction/plans)

Before using a database for real production data, verify:

- Backup retention.
- Point-in-time restore support.
- Storage and compute limits.
- Connection limits.
- Region and latency.
- Upgrade cost.

### GitHub Actions cost

Standard GitHub-hosted runners are currently free for public repositories. Private repositories consume the minutes included in the GitHub account plan.

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## Recommended CI/CD pipeline

```text
Pull request
    |
    +-- Backend lint, formatting, types, and tests
    +-- Frontend lint, formatting, tests, coverage, and build
    +-- Docker image build and PostgreSQL migration smoke test [already present]
    +-- Full PostgreSQL integration tests [still needed]
    +-- Playwright E2E and accessibility tests
    +-- Dependency, code, secret, and container security scans
    |
Required checks pass
    |
Merge to main
    |
Run a controlled production migration
    |
Deploy backend
    |
Check readiness endpoint
    |
Deploy frontend
    |
Run production smoke tests
    |
Mark successful or roll back
```

For strict deployment safety, disable provider deployments that run independently on every push. Let GitHub Actions deploy only after all required test and security jobs pass.

Store deployment credentials and production configuration in GitHub Environments and repository secrets. Never put database credentials, signing keys, deployment tokens, or real `.env` files in the repository.

Recommended environments:

- **Pull request:** automated CI and optional frontend preview deployment.
- **Staging:** automated deployment from `main`, followed by migrations and smoke/E2E tests.
- **Production:** deployment after staging succeeds, preferably with manual approval.

## Recommended implementation order

1. Fix Alembic SSL behavior.
2. Complete refresh-token and logout behavior.
3. Fix Mypy errors and make Mypy blocking.
4. Extend the existing Docker/PostgreSQL CI job to run the backend integration suite and migration-upgrade tests.
5. Add Playwright E2E and accessibility testing to CI.
6. Add test artifacts, security scans, and dependency automation.
7. Add Cloudflare Pages and Render deployment configuration.
8. Create staging deployment and post-deployment smoke tests.
9. Protect production with GitHub Environment approval and rollback procedures.
10. Add error monitoring, uptime checks, alerts, and tested database restoration.

## Definition of ready for production

Before calling AuthFlow production-ready, verify all of the following:

- All unit, integration, E2E, and accessibility tests pass in CI.
- Tests run against the same major PostgreSQL version used in production.
- All migrations apply successfully to a new empty database and from the previously released revision.
- Mypy, linting, formatting, coverage, and production builds are blocking checks.
- No high- or critical-severity dependency or container vulnerabilities remain unresolved.
- Production secrets exist only in protected secret stores.
- `ENVIRONMENT=production` and `DEBUG=false` are explicitly configured.
- CORS contains only the real frontend origins.
- Authentication refresh, logout, expiry, and revocation work correctly.
- Staging deployment and smoke tests succeed.
- Production deployment requires the configured checks and approval.
- Health/readiness monitoring and alerts are active.
- Database backup restoration has been tested.
- A rollback procedure is documented and has been rehearsed.
