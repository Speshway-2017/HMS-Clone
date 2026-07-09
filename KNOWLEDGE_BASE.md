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
- **Two independent apps**: `server` and `client` are separate Node projects, each with its own
  `package.json` / lockfile / `node_modules` — no root package.json or shared workspace tooling.
  Run each with its own `npm install` and `npm run dev`, in two terminals.

## Repo layout
```
server/src/
  config/        env.ts, db.ts (connects to MONGO_URI)
  models/        Mongoose schemas — User, Hospital, Branch, Department, Report (grows per module)
  middleware/    auth.ts (protect/restrictTo), scopeToHospital.ts, errorHandler.ts
  controllers/ routes/   one pair per resource (auth, hospitals, branches, departments, admins,
                 roles, analytics, reports)
  utils/         AppError, catchAsync, pagination, csv, idGenerator, rolePermissions, ensureSuperAdmin
  seed/seed.ts   demo data for local dev
client/src/
  pages/{public,auth,super-admin,hospital-admin,accountant}/
  layouts/       PublicLayout, DashboardLayout (Sidebar + Topbar)
  components/ui/ Button, Card, KpiCard, ChartCard, DataTable, Badge, Modal, Sidebar, Topbar,
                 Field (InputField/SelectField/TextareaField), FormSection, Pagination
  features/      TanStack Query hooks per resource (hospitals.ts, branches.ts, departments.ts,
                 admins.ts, roles.ts, analytics.ts, reports.ts) — same pattern in every file:
                 useX/useXs query hooks + useCreateX/useUpdateX/useDeleteX mutations
  config/nav.ts  per-role sidebar navigation definitions
  config/departmentTheme.ts   icon/color per department category, for the Departments grid
  context/AuthContext.tsx   current user/session (calls GET /auth/me on load)
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
`server` and `client` are installed and run independently, in separate terminals.

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev        # http://localhost:5000 — auto-creates the super_admin below if the DB is empty

# Terminal 2 — frontend
cd client
npm install
npm run dev        # http://localhost:5173
```

### Super admin bootstrap
On every startup, `server/src/utils/ensureSuperAdmin.ts` checks if the `User` collection is empty;
if so it creates one `super_admin` account from `SUPER_ADMIN_NAME` / `SUPER_ADMIN_EMAIL` /
`SUPER_ADMIN_PASSWORD` in `server/.env` (see `.env.example`). This means a brand-new local MongoDB
gets a working login the moment the server starts, with no manual seeding step. It only fires when
the collection has zero documents, so it never runs again (or duplicates) once any user exists.

`npm run seed` is still available separately for full demo data (a sample hospital plus
hospital_admin/accountant accounts) — it wipes `Users`/`Hospitals` first and uses the same
`SUPER_ADMIN_*` env values for the super_admin it creates.

Vite proxies `/api/*` to `localhost:5000` in dev (`client/vite.config.ts`), so the browser sees the
cookie as same-origin — no CORS/cross-site-cookie complications locally, even though the two apps
run as fully separate processes with their own dependency trees.

### Demo accounts
| Email | Role | Password | Source |
|---|---|---|---|
| value of `SUPER_ADMIN_EMAIL` in `.env` | super_admin | `SUPER_ADMIN_PASSWORD` in `.env` | auto-bootstrap or `npm run seed` |
| `admin@hms.test` | hospital_admin (Sunrise General Hospital) | `Password123!` | `npm run seed` only |
| `accountant@hms.test` | accountant (Sunrise General Hospital) | `Password123!` | `npm run seed` only |

`npm run seed` wipes and recreates `User`/`Hospital`/`Branch`/`Department`/`Report`, then seeds one
sample branch and department under "Sunrise General Hospital" so the Super Admin screens have real
data to show immediately.

## Build roadmap (see `C:\Users\HP\.claude\plans\compressed-scribbling-dove.md` for the full plan)
1. ✅ Foundation — monorepo→separate apps, auth, shared UI kit, layouts, seed script.
2. ✅ Public site + Login — modern responsive landing page + login wired to real auth API.
3. ✅ Super Admin module — Hospital/Branch/Department/Admin/Report models + full CRUD APIs + all 14
   screens (Dashboard, Hospitals list/add/edit/details, Branches list/add/edit, Departments grid/
   add/edit/metrics, Admins list/add/edit, Manage Roles, Analytics, Reports).
4. ⬜ Hospital Admin module — Doctor/Staff/Patient/Appointment/Inventory models + CRUD + 18 screens.
5. ⬜ Accountant module — Invoice/Payment/InsuranceClaim/Expense/Payroll/AuditLog models + CRUD + 20 screens.
6. ⬜ Cross-cutting polish — global search, notifications, audit-log hooks, final seed pass.

Hospital Admin / Accountant dashboards still show static KPI shells (see `pages/{role}/Dashboard.tsx`)
— wired to real data when phases 4–5 land.

### Honest-empty data policy (Super Admin module)
Every number on every Super Admin screen comes from a real Mongo query. Hospitals/Branches/
Departments/Admins counts are fully real. Metrics that depend on modules not built yet — Revenue,
Active Patients, Appointments, Doctor/staff performance, bed occupancy — render explicit "no data
yet" states instead of fabricated numbers (see `analyticsController.ts`'s `pending` flags and the
empty-state cards in `AnalyticsPage.tsx`/`HospitalDetailsPage.tsx`/`DepartmentMetricsPage.tsx`).
Reports Hub was similarly re-scoped from Figma's fictional PDF/XLSX financial reports to a real CSV
export of the 4 registries we do have, logged to the `Report` collection. "Manage Roles" shows our
3 real fixed roles with live assigned-user counts, not Figma's 14 fictional roles.

### Gotchas
- `components/ui/Card.tsx` only adds its default `bg-white` when the caller's `className` doesn't
  already contain a `bg-` utility (checked via regex) — otherwise two conflicting `bg-*` classes on
  one element race on Tailwind's generated stylesheet order, not JSX string order, and the wrong one
  can win. This is why `<Card className="bg-navy-700 text-white">` (used for emphasized KPI cards)
  reliably shows the navy background instead of silently rendering white-on-white text.

## Design reference
Figma file: `ifQiK3X0WSWTVzfflLHMhQ`, one page, three labeled sections each containing many
individual screen frames: **Super Admin Dashboard** (13 screens, starts at node `0:326`),
**Accountant Dashboard** (20 screens, starts at node `0:4825`), **Hospital Admin Dashboard**
(18 screens, starts at node `0:10923`). No login/landing frames exist there; those were designed
fresh in this codebase to match the navy/white SaaS visual language (sidebar + topbar, KPI cards
with icon-in-tinted-box, chart cards, status-pill tables).
