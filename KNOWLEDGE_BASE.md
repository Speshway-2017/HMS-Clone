# HMS Enterprise — Knowledge Base

## What this is
A MERN (MongoDB, Express, React, Node) Hospital Management System, built from a Figma design
(`ifQiK3X0WSWTVzfflLHMhQ`) containing three role-based dashboards. A public marketing landing page
and login page were designed fresh (not in the Figma file) to match the same visual language.
The patient-facing experience will be a separate mobile app, built later — patients exist in this
system only as data managed through the web dashboards.

## Roles
| Role | Scope | Sidebar modules |
|---|---|---|
| `super_admin` | Entire network, all hospitals | Hospitals, Branches, Departments, Admins, Manage Roles, Analytics, Reports |
| `hospital_admin` | One hospital (`user.hospital`) | Doctors, Patients, Appointments, Staff, Departments, Finance, Inventory |
| `accountant` | One hospital (`user.hospital`) — same tenant scoping as hospital_admin | Billing, Payments, Insurance Claims, Payroll, Expenses, Financial Analytics, Audit Logs |

There are only these 3 fixed roles for v1 — "Manage Roles" / permission-matrix screens are a
static, read-only display of this table, not a dynamic custom-role engine.

## Tech stack
- **Backend**: Node + Express 4 + TypeScript, Mongoose, JWT auth via **httpOnly cookie**
  (`hms_token`, see `server/src/utils/token.ts`), bcrypt password hashing, zod request validation.
- **Frontend**: React 18 + Vite + TypeScript, React Router v6, Tailwind CSS (theme tokens in
  `client/tailwind.config.ts` — `navy` palette pulled from the Figma screenshots), TanStack Query
  for server state, Recharts for charts, lucide-react for icons.
- **Monorepo**: npm workspaces (`server`, `client`), root `npm run dev` runs both concurrently via
  `concurrently`.

## Repo layout
```
server/src/
  config/        env.ts, db.ts (connects to MONGO_URI)
  models/        Mongoose schemas (User, Hospital, ... grows per module)
  middleware/    auth.ts (protect/restrictTo), scopeToHospital.ts, errorHandler.ts
  controllers/ routes/   one pair per resource
  seed/seed.ts   demo data for local dev
client/src/
  pages/{public,auth,super-admin,hospital-admin,accountant}/
  layouts/       PublicLayout, DashboardLayout (Sidebar + Topbar)
  components/ui/ Button, Card, KpiCard, ChartCard, DataTable, Badge, Modal, Sidebar, Topbar
  context/AuthContext.tsx   current user/session (calls GET /auth/me on load)
  config/nav.ts  per-role sidebar navigation definitions
  router.tsx     role-guarded route tree
```

## Auth flow
1. `POST /api/v1/auth/login` — email+password, bcrypt-compares against `User.passwordHash`,
   signs a JWT (`{ id, role }`), sets it as an httpOnly `secure` (in prod) cookie.
2. Every protected request: `protect` middleware reads the cookie, verifies the JWT, loads
   `req.user` from Mongo.
3. `restrictTo(...roles)` middleware gates routes by role.
4. `scopeToHospital` middleware (must run after `protect`) auto-filters tenant-scoped queries:
   - `hospital_admin` / `accountant` → forced to `req.user.hospital`.
   - `super_admin` → sees everything, or narrows via `?hospitalId=`.
5. Frontend never stores the token — `AuthContext` just tracks the logged-in user object from
   `/auth/me` / the login response. Logout calls `POST /auth/logout` which clears the cookie.

## Local development
Requires MongoDB running locally on the default port (`mongod` / MongoDB Community Server / Compass).

```bash
npm install          # installs both workspaces
npm run seed          # wipes Users/Hospitals, creates demo accounts (see below)
npm run dev            # runs server (:5000) + client (:5173) together
```

Vite proxies `/api/*` to `localhost:5000` in dev (`client/vite.config.ts`), so the browser sees the
cookie as same-origin — no CORS/cross-site-cookie complications locally.

### Seeded demo accounts (password for all: `Password123!`)
| Email | Role |
|---|---|
| `superadmin@hms.test` | super_admin |
| `admin@hms.test` | hospital_admin (Sunrise General Hospital) |
| `accountant@hms.test` | accountant (Sunrise General Hospital) |

## Build roadmap (see `C:\Users\HP\.claude\plans\compressed-scribbling-dove.md` for the full plan)
1. ✅ Foundation — monorepo, auth, shared UI kit, layouts, seed script.
2. ✅ Public site + Login — landing page + login wired to real auth API.
3. ⬜ Super Admin module — Hospital/Branch/Department/Admin models + CRUD + 13 screens.
4. ⬜ Hospital Admin module — Doctor/Staff/Patient/Appointment/Inventory models + CRUD + 18 screens.
5. ⬜ Accountant module — Invoice/Payment/InsuranceClaim/Expense/Payroll/AuditLog models + CRUD + 20 screens.
6. ⬜ Cross-cutting polish — global search, notifications, audit-log hooks, final seed pass.

Phases 1–2 are done; dashboards currently show static KPI shells (see `pages/{role}/Dashboard.tsx`) —
these get wired to real data as each module's backend lands in phases 3–5.

## Design reference
Figma file: `ifQiK3X0WSWTVzfflLHMhQ`, one page, three labeled sections each containing many
individual screen frames: **Super Admin Dashboard** (13 screens, starts at node `0:326`),
**Accountant Dashboard** (20 screens, starts at node `0:4825`), **Hospital Admin Dashboard**
(18 screens, starts at node `0:10923`). No login/landing frames exist there; those were designed
fresh in this codebase to match the navy/white SaaS visual language (sidebar + topbar, KPI cards
with icon-in-tinted-box, chart cards, status-pill tables).
