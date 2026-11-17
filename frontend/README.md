# VoxDesk AI frontend

Owner, Reception and Staff dashboards for VoxDesk AI. React, TypeScript, Vite, Tailwind CSS v4 and React Router.

## Run it

```sh
pnpm install
cp .env.example .env.development.local   # VITE_USE_MOCKS=true runs the in-browser demo API
pnpm dev
```

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Type-check, then production build into `dist/` |
| `pnpm typecheck` | TypeScript only |
| `pnpm lint` | ESLint |

### Demo mode

With `VITE_USE_MOCKS=true` the app talks to `src/mocks/mockApi.ts` instead of the backend. It applies the same rules the backend must (roles, tenant isolation, availability, idempotent bookings) on data generated around today's date. Nothing is saved: a reload resets it. The header shows a "Demo data" label while it is on.

Demo accounts (password `demo1234`): `sara@maisonstudio.pk` (owner, Pro), `nida@maisonstudio.pk` (reception), `ayesha@maisonstudio.pk` and `bilal@maisonstudio.pk` (staff), `omar@urbancuts.pk` (owner, Free plan, shows the locked Services page).

## Structure

```
src/
  app/            router (role sections behind guards)
  api/            contract.ts (every backend call), http.ts (real client), errors.ts
  mocks/          demo API and seed data, used only when VITE_USE_MOCKS=true
  components/     ui/ (buttons, fields, dialogs, badges, states), layout/ (shell, sidebar, top bar, tab bar)
  config/         navigation per role
  features/       one folder per area; pages compose shared pieces
  lib/            time zone maths, formatting, data fetching, theme
  styles/         design tokens (Truck Art palette, light and dark) and Tailwind theme
  types/          domain models
```

The design reference these screens follow is in `../design/`.

## Rules the UI follows

- **The backend decides availability.** Free times always come from `GET /availability`. A booking shows as confirmed only after `POST /appointments` succeeds. Every booking and reschedule sends an `Idempotency-Key` header, and the confirm button is locked while a request is in flight.
- **Role checks in the UI are for navigation only.** Each role section is wrapped in `RequireRole`, but the backend must check the role and tenant on every request.
- **Staff see only their own work.** Staff screens call self-scoped endpoints (`/me/...`) or rely on the backend filtering `/appointments` and `/customers` to the signed-in staff member, without phone numbers or prices.
- **Times are shown in the business time zone** from settings, never the browser's.

## Backend contract

The session is a cookie (`credentials: 'include'`). No call sends a business id: the backend resolves the tenant from the session. Errors return JSON `{ code, message, fields? }`; `code` is one of `SLOT_UNAVAILABLE`, `CONFLICT`, `VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `PLAN_REQUIRED`. Times are ISO 8601 UTC; `date` parameters are `YYYY-MM-DD` in the business time zone.

| Method and path | Roles | Notes |
|---|---|---|
| `GET /auth/session` | any | 401 when signed out |
| `POST /auth/login`, `POST /auth/logout`, `POST /auth/password` | any | |
| `PATCH /business` | owner | profile, hours, time zone, currency, locale, date format, cancellation policy, notifications |
| `GET /appointments` | all | `from`, `to`, `status[]`, `staff_id`, `service_id`, `customer_id`, `search`, `sort`, `limit`; staff get only their own |
| `GET /appointments/{id}` | all | |
| `GET /availability` | owner, reception | `service_id`, `date`, optional `staff_id`, `exclude_appointment_id` |
| `POST /appointments` | owner, reception | `Idempotency-Key`; 409 `SLOT_UNAVAILABLE` if the time was taken |
| `POST /appointments/{id}/reschedule` | owner, reception | `Idempotency-Key`; `{ start, staffId }` |
| `POST /appointments/{id}/cancel` | owner, reception | `{ reason }` |
| `POST /appointments/{id}/status` | owner, reception | `CONFIRMED`, `COMPLETED` or `NO_SHOW` |
| `GET /customers`, `GET /customers/{id}`, `GET /customers/{id}/appointments` | all | staff: only their customers, no contact details |
| `POST /customers`, `PATCH /customers/{id}` | owner, reception | 409 on duplicate phone |
| `GET /staff` | owner, reception | |
| `POST /staff`, `PATCH /staff/{id}`, `POST /staff/{id}/activate`, `POST /staff/{id}/deactivate` | owner | |
| `GET /services` | all | |
| `POST /services`, `PATCH /services/{id}` | owner, Pro plan | 402 `PLAN_REQUIRED` on Free |
| `GET /cancellation-requests` | owner, reception | optional `status` |
| `POST /cancellation-requests/{id}/approve`, `.../retain` | owner, reception | retain only if the policy allows it |
| `GET /analytics` | owner | `from`, `to` |
| `GET /activity` | owner, reception | `limit` |
| `GET /notifications`, `POST /notifications/read-all` | all | per user |
| `GET /receptionist`, `PUT /receptionist`, `POST /receptionist/test` | owner | |
| `GET /integrations`, `POST /integrations/{id}/connect`, `.../disconnect` | owner | |
| `GET /me/schedule`, `GET /me/profile`, `PATCH /me/profile` | staff | `from`, `to` for schedule |

Request and response shapes are the TypeScript types in `src/types/domain.ts` and `src/api/contract.ts`. The HTTP client sends camelCase bodies and snake_case query parameters; align this with the FastAPI models before integration.
