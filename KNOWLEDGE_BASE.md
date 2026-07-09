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
| `super_admin` | Entire network, all hospitals | Hospitals, Branches, Departments, Admins, Manage Roles, Analytics, Reports, **Settings** |
| `hospital_admin` | One hospital (`user.hospital`) | Doctors, Patients, Appointments, Staff, Departments, Finance, Inventory, Roles, **Settings** |
| `accountant` | One hospital (`user.hospital`) — same tenant scoping as hospital_admin | Billing, Payments, Insurance Claims, Payroll, Expenses, Financial Analytics, Audit Logs, **Settings** |

There are only these 3 fixed roles for v1 — "Manage Roles" / permission-matrix screens are a
static, read-only display of this table, not a dynamic custom-role engine.

## Tech stack
- **Backend**: Node + Express 4 + TypeScript, Mongoose, JWT auth via **`sessionStorage`**
  (see `client/src/lib/tokenStorage.ts` and `server/src/utils/token.ts`), bcrypt password hashing,
  zod request validation, Cloudinary for file storage (hospital logos/licenses, admin profile photos).
- **Frontend**: React 18 + Vite + TypeScript, React Router v6, Tailwind CSS (theme tokens in
  `client/tailwind.config.ts` — `navy` palette pulled from the Figma screenshots), TanStack Query
  for server state, Recharts for charts, lucide-react for icons.
- **Two independent apps**: `server` and `client` are separate Node projects, each with its own
  `package.json` / lockfile / `node_modules` — no root package.json or shared workspace tooling.
  Run each with its own `npm install` and `npm run dev`, in two terminals.

## Repo layout
```
server/src/
  config/        env.ts, db.ts (connects to MONGO_URI), cloudinary.ts
  models/        Mongoose schemas — User, Hospital, Branch, Department, Report,
                 Doctor, Staff, Patient, Appointment, InventoryItem, Invoice
  middleware/    auth.ts (protect/restrictTo), scopeToHospital.ts, upload.ts, errorHandler.ts
  controllers/ routes/   one pair per resource (auth, hospitals, branches, departments, admins,
                 roles, analytics, reports, uploads, doctors, staff, patients, appointments,
                 inventory, invoices, notifications)
  utils/         AppError, catchAsync, pagination, csv, idGenerator, rolePermissions, ensureSuperAdmin
  seed/seed.ts   demo data for local dev
client/src/
  pages/{public,auth,super-admin,hospital-admin,accountant,shared}/
                 shared/ contains SettingsPage.tsx (used by all 3 roles)
  layouts/       PublicLayout, DashboardLayout (Sidebar + Topbar)
  components/ui/ Button, Card, KpiCard, ChartCard, DataTable, Badge, Modal, Sidebar, Topbar,
                 Field (InputField/SelectField/TextareaField), FormSection, Pagination,
                 FileUpload, NotificationPanel
  features/      TanStack Query hooks per resource (hospitals.ts, branches.ts, departments.ts,
                 admins.ts, roles.ts, analytics.ts, reports.ts, doctors.ts, staff.ts, patients.ts,
                 appointments.ts, inventory.ts, invoices.ts, auth.ts, notifications.ts)
                 — same pattern: useX/useXs query hooks + useCreateX/useUpdateX/useDeleteX mutations
  config/nav.ts  per-role sidebar navigation definitions (Settings item added for all 3 roles)
  config/departmentTheme.ts   icon/color per department category, for the Departments grid
  context/AuthContext.tsx   current user/session (calls GET /auth/me on load)
  router.tsx     role-guarded route tree (includes /settings under each role)
```

### Shared pages between roles
`pages/super-admin/DepartmentsPage.tsx` / `DepartmentFormPage.tsx` / `DepartmentMetricsPage.tsx`
and `ManageRolesPage.tsx` are used by **both** `/super-admin/*` and `/admin/*` routes (imported
into both branches of `router.tsx`) rather than duplicated — they compute their base path via
`ROLE_HOME_PATH[user.role]` and conditionally hide super_admin-only fields (Parent Hospital/Branch
selects) when the logged-in user is a `hospital_admin`. The underlying `departments`/`roles`
backend routes are shared the same way, via `scopeToHospital` + `restrictTo('super_admin',
'hospital_admin')`.

`pages/shared/SettingsPage.tsx` is imported into all **three** role route trees
(`/super-admin/settings`, `/admin/settings`, `/accountant/settings`) — single source of truth
for the Change Password UI.

## Auth flow
1. `POST /api/v1/auth/login` — email+password, bcrypt-compares against `User.passwordHash`,
   signs a JWT (`{ id, role }`) and returns it in the response body as `data.token`.
2. The frontend stores that token in **`sessionStorage`** (`client/src/lib/tokenStorage.ts`), not a
   cookie — `sessionStorage` is scoped per browser tab/window, so logging into a different account
   in a different tab doesn't clobber other open sessions. An axios request interceptor
   (`client/src/lib/api.ts`) attaches it as `Authorization: Bearer <token>` on every request.
3. Every protected request: `protect` middleware reads that header, verifies the JWT, loads
   `req.user` from Mongo.
4. `restrictTo(...roles)` middleware gates routes by role.
5. `scopeToHospital` middleware (must run after `protect`) auto-filters tenant-scoped queries:
   - `hospital_admin` / `accountant` → forced to `req.user.hospital`.
   - `super_admin` → sees everything, or narrows via `?hospitalId=`.
6. Auth is fully stateless — logout just clears `sessionStorage` client-side (`POST /auth/logout`
   is a no-op kept for API symmetry, since there's no server-side session to invalidate).

Trade-off: this replaced an earlier httpOnly-cookie design (immune to XSS token theft) specifically
to support multiple simultaneous logins in different windows, which cookies can't do since they're
shared across every tab of the same origin. `sessionStorage` is readable by JS, so it's more exposed
to XSS than an httpOnly cookie would be — acceptable here since there's no XSS-introducing
third-party script/CDN content in this app.

## File uploads (Cloudinary)
`server/src/config/cloudinary.ts` parses `CLOUDINARY_URL` from `.env`
(`cloudinary://<api_key>:<api_secret>@<cloud_name>`) and configures the SDK at startup — fails fast
if the var is missing or malformed. `POST /api/v1/uploads` (multipart, field name `file`, plus a
`folder` field restricted to `hospital-logos`/`hospital-licenses`/`admin-avatars`) streams the file
straight to Cloudinary via `multer` memory storage (no temp files on disk) and returns
`{ url, publicId, resourceType }`. `client/src/components/ui/FileUpload.tsx` is the reusable
frontend piece — used for hospital logo/license in `HospitalFormPage` and admin profile photo in
`AdminFormPage`; the returned Cloudinary URL is stored directly on `Hospital.logoUrl`/`licenseUrl`
and `User.avatarUrl`.

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

Vite proxies `/api/*` to `localhost:5000` in dev (`client/vite.config.ts`), so requests appear
same-origin to the browser — avoids CORS complications locally even though the two apps run as
fully separate processes with their own dependency trees.

### Demo accounts
| Email | Role | Password | Source |
|---|---|---|---|
| value of `SUPER_ADMIN_EMAIL` in `.env` | super_admin | `SUPER_ADMIN_PASSWORD` in `.env` | auto-bootstrap or `npm run seed` |
| `admin@hms.test` | hospital_admin (Sunrise General Hospital) | `Password123!` | `npm run seed` only |
| `accountant@hms.test` | accountant (Sunrise General Hospital) | `Password123!` | `npm run seed` only |

**⚠️ `npm run seed` wipes every collection it touches with an unconditional `deleteMany({})` —
`User`, `Hospital`, `Branch`, `Department`, `Report`, `Doctor`, `Staff`, `Patient`, `Appointment`,
`InventoryItem`, `Invoice` — including any accounts/records created by hand through the running
app, not just prior seed output. Check `db.users.find()` before running it if the database has
real (non-demo) accounts you want to keep.** It (re)creates "Sunrise General Hospital" with one
sample doctor, staff member, patient (with a medical history entry), appointment, inventory item,
and invoice, so every dashboard has real data to show immediately after seeding.

## Build roadmap (see `C:\Users\HP\.claude\plans\compressed-scribbling-dove.md` for the full plan)
1. ✅ Foundation — monorepo→separate apps, auth, shared UI kit, layouts, seed script.
2. ✅ Public site + Login — modern responsive landing page + login wired to real auth API.
3. ✅ Super Admin module — Hospital/Branch/Department/Admin/Report models + full CRUD APIs + all 14
   screens (Dashboard, Hospitals list/add/edit/details, Branches list/add/edit, Departments grid/
   add/edit/metrics, Admins list/add/edit, Manage Roles, Analytics, Reports).
4. ✅ Hospital Admin module — Doctor/Staff/Patient/Appointment/InventoryItem/Invoice models + full
   CRUD APIs + all 19 screens (Dashboard, Doctors list/add/profile/performance, Patients
   list/add/details incl. medical history, Appointments list/add/workflow-details, Staff
   list/add, Departments grid/add/metrics (shared with Super Admin), Finance + invoice
   create/detail, Inventory list/add/item-details, Roles (shared)). Every hospital_admin request
   is hard-scoped to `req.user.hospital` via `scopeToHospital` — verified two hospital_admins
   from different hospitals cannot see/edit/delete each other's data.
## Settings & Change Password
`PATCH /api/v1/auth/change-password` (protected, all roles) accepts `{ newPassword, confirmPassword }`,
validates they match, bcrypt-hashes with cost 12, and saves. No current-password check,
no strength policy — any non-empty value is accepted. Frontend: `pages/shared/SettingsPage.tsx`
with `features/auth.ts → useChangePassword()` mutation.

## Notification system (hospital_admin only)
`GET /api/v1/notifications` (protected + `scopeToHospital`) runs 4 parallel Mongo queries and
returns a unified `notifications[]` array:

| Type | Query | Severity |
|---|---|---|
| `appointment` | `status: scheduled`, `date` today or tomorrow | info |
| `inventory` | `stockQty ≤ reorderLevel` | warning (low) / critical (0 qty) |
| `invoice` | `status: overdue` OR `status: pending` with `dueDate < now` | critical / warning |
| `patient` | `createdAt` within last 24 h | info |

Frontend: `components/ui/NotificationPanel.tsx` — bell button with red unread-count badge,
dropdown panel, sorted critical-first, click-to-navigate, mark-all-read, skeleton, empty state,
auto-refreshes every 60 s (TanStack Query `refetchInterval`). Notifications are **read-only
client-side** — there is no `isRead` field in the DB; "read" state lives in component `useState`
and resets on page reload (intentional — always shows the live DB state on load).

5. ⬜ Accountant module — Payment/InsuranceClaim/Expense/Payroll/AuditLog models + CRUD + 20 screens
   (the `Invoice` model from phase 4 is reused, not rebuilt).
6. 🔄 Cross-cutting polish — ✅ notifications (hospital_admin), ✅ Settings/Change Password (all
   roles); remaining: global search, audit-log hooks, final seed pass.

Accountant dashboard still shows a static KPI shell (see `pages/accountant/Dashboard.tsx`) — wired
to real data when phase 5 lands.

### Honest-empty data policy
Every number on every Super Admin and Hospital Admin screen comes from a real Mongo query.
Hospitals/Branches/Departments/Admins/Doctors/Staff/Patients/Appointments/Inventory/Invoice counts
are fully real — including bed occupancy (`Department.occupiedBeds`/`totalBeds`, editable per
department) and revenue (summed from real `Invoice` documents). Metrics that still depend on
modules not built yet — hospital-wide patient satisfaction trend charts, doctor consultation-time
telemetry, supplier/purchase-order tracking — render explicit "no data yet" states instead of
fabricated numbers (see `analyticsController.ts`'s `pending` flags and the empty-state cards in
`AnalyticsPage.tsx`/`HospitalDetailsPage.tsx`/`DepartmentMetricsPage.tsx`/`DoctorPerformancePage.tsx`).
Reports Hub was similarly re-scoped from Figma's fictional PDF/XLSX financial reports to a real CSV
export of the 4 registries we do have, logged to the `Report` collection. "Manage Roles"/"Role
Permission Matrix" shows our 3 (or 2, hospital-scoped) real fixed roles with live assigned-user
counts, not Figma's 14 fictional roles. Inventory's Purchase-Order/Supplier-Performance panels and
Appointment's live vitals-tracking widgets were dropped as separate subsystems out of scope here —
see the full list of adaptations in the Hospital Admin module plan file.

### Gotchas
- `components/ui/Card.tsx` only adds its default `bg-white` when the caller's `className` doesn't
  already contain a `bg-` utility (checked via regex) — otherwise two conflicting `bg-*` classes on
  one element race on Tailwind's generated stylesheet order, not JSX string order, and the wrong one
  can win. This is why `<Card className="bg-navy-700 text-white">` (used for emphasized KPI cards)
  reliably shows the navy background instead of silently rendering white-on-white text.
- `NotificationPanel` read state is **ephemeral** — `readIds` lives in `useState`, so re-opening
  the panel or navigating away resets it. This is intentional: notifications always reflect the
  latest DB state on each mount, so stale "already read" markers from a prior session would be
  misleading.
- `features/auth.ts` exports `useChangePassword` using a **named export** `{ api }` from
  `lib/api.ts` (not a default export) — this is a common gotcha when adding new feature files.

## Design reference
Figma file: `ifQiK3X0WSWTVzfflLHMhQ`, one page, three labeled sections each containing many
individual screen frames: **Super Admin Dashboard** (14 screens, starts at node `0:326`),
**Accountant Dashboard** (20 screens, starts at node `0:4825`), **Hospital Admin Dashboard**
(19 screens, starts at node `0:10923`). No login/landing frames exist there; those were designed
fresh in this codebase to match the navy/white SaaS visual language (sidebar + topbar, KPI cards
with icon-in-tinted-box, chart cards, status-pill tables).
