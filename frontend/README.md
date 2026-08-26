# AuthFlow frontend

Production-oriented React 19 client for the AuthFlow FastAPI service. It includes two-step registration, persisted JWT authentication, profile editing, role-gated administration, server-side user filtering/pagination, soft-delete confirmation, and live statistics.

## Run locally

1. Start the API from `backend/` on `http://localhost:8000`.
2. Copy `.env.example` to `.env` if the API uses a different URL.
3. Install and start the client:

   ```bash
   pnpm install
   pnpm dev
   ```

The app runs at `http://localhost:5173` by default.

## Available checks

```bash
pnpm build
pnpm lint
pnpm format:check
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:coverage
pnpm test:e2e
```

## Unit and integration tests

Vitest runs the fast frontend test suite in a jsdom browser-like environment. React Testing
Library and `user-event` exercise components through accessible labels and roles, while MSW
intercepts HTTP requests at the network boundary. These tests do not require the frontend or API
servers to be running.

For the complete beginner-friendly workflow, including when to run each test layer and how CI/CD
automation fits together, see
[`docs/FRONTEND_TESTING_AND_AUTOMATION.md`](../docs/FRONTEND_TESTING_AND_AUTOMATION.md).

```bash
pnpm test              # all Vitest tests once
pnpm test:unit         # isolated functions, stores, hooks, and UI primitives
pnpm test:integration  # forms/pages using React Query, Zustand, and mocked HTTP
pnpm test:watch        # rerun affected tests while developing
pnpm test:coverage     # enforce thresholds and write frontend/coverage/index.html
```

Test files are colocated with the source they verify:

- `*.unit.test.ts(x)` covers one small module in isolation.
- `*.integration.test.tsx` covers multiple frontend modules working together.
- `e2e/*.spec.ts` covers the complete application in Chromium against the real API.

Coverage thresholds are 80% for lines, statements, and functions and 75% for branches. Coverage
is a safety net, not a quality score: important behavior and failure paths should be asserted even
when a line has already been executed. Open `coverage/index.html` after a coverage run to inspect
uncovered paths by file.

## End-to-end tests

The Playwright suite covers authentication, protected routes, client/admin authorization,
dashboard and profile journeys, mobile sign-out behavior, user administration, button contrast,
and automated WCAG checks with axe.

Install the pinned Chromium browser once:

```bash
pnpm exec playwright install chromium
```

Start the API on `http://localhost:8000`, make sure the development test accounts from the root
README exist, and run:

```bash
pnpm test:e2e          # headless suite
pnpm test:e2e:headed   # visible browser
pnpm test:e2e:ui       # Playwright UI mode
pnpm test:e2e:report   # open the last HTML report
```

Playwright starts its own frontend server on `http://localhost:5173` and refuses to reuse an
existing server so the selected branch is always the code under test. The admin journey creates
uniquely named `e2e.*@example.com` clients and deactivates only those test-owned accounts, including
cleanup after failures.

The defaults can be overridden without changing source:

```bash
E2E_BASE_URL=http://localhost:5173
E2E_API_HEALTH_URL=http://localhost:8000/health
E2E_ADMIN_EMAIL=maya@gmail.com
E2E_ADMIN_PASSWORD=password1
E2E_CLIENT_EMAIL=ahmadkhalaf517@gmail.com
E2E_CLIENT_PASSWORD=password1
```

## Bootstrap the first administrator

Public registration always creates a `client`; this is enforced by the API. To bootstrap an admin:

1. Register a normal account in the frontend.
2. Promote that account directly in the database by setting its `type` to `admin`, or ask an existing administrator to call `PUT /api/v1/users/{id}` with `{"type":"admin"}`.
3. Sign out and back in so the refreshed profile contains the new role.

Application code does not seed an administrator automatically. The E2E suite expects the
development-only accounts documented in the root README to exist in the selected test database.

## Security notes

- Only the bearer token and non-sensitive user profile are persisted in browser storage.
- Logout is client-side because the API uses stateless JWTs and has no logout endpoint.
- Route guards improve navigation UX; the API remains the authorization boundary.
- Soft-deleted users cannot sign in. The backend exposes no restore endpoint.
