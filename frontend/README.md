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
```

## Bootstrap the first administrator

Public registration always creates a `client`; this is enforced by the API. To bootstrap an admin:

1. Register a normal account in the frontend.
2. Promote that account directly in the database by setting its `type` to `admin`, or ask an existing administrator to call `PUT /api/v1/users/{id}` with `{"type":"admin"}`.
3. Sign out and back in so the refreshed profile contains the new role.

There are intentionally no default admin credentials.

## Security notes

- Only the bearer token and non-sensitive user profile are persisted in browser storage.
- Logout is client-side because the API uses stateless JWTs and has no logout endpoint.
- Route guards improve navigation UX; the API remains the authorization boundary.
- Soft-deleted users cannot sign in. The backend exposes no restore endpoint.
