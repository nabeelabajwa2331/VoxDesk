# VoxDesk AI

AI-powered virtual receptionist and appointment management platform for service businesses.

## Repository layout

| Path | Contents | Stack |
|---|---|---|
| `frontend/` | Owner, Reception and Staff dashboards | React, TypeScript, Vite, Tailwind CSS v4 |
| `backend/` | API, business logic, persistence (separate workstream) | Python, FastAPI, PostgreSQL |

The backend is the source of truth for availability, bookings, permissions and tenant isolation. The frontend never confirms a booking or grants access on its own.

## Frontend

Requires Node.js and pnpm.

```sh
cd frontend
pnpm install
pnpm dev
```

During development the frontend can run against a mock API. Mock data is for demonstration only and is not persisted.

## Environment

Environment files (`.env`, `.env.*`) are git-ignored. Commit only `.env.example` files with placeholder values.
