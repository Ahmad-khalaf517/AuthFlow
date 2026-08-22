# AuthFlow Frontend

Reserved for the future AuthFlow frontend client. Not started yet — the framework
(React/Vue/etc.) and structure will be decided when frontend work begins.

The backend exposes a JSON REST API under `backend/`, consumed via
`http://localhost:8000/api/v1` in local development. Once the backend's auth
endpoints exist, this app will handle login/registration forms, token storage,
and role-based UI (admin vs. client views).
