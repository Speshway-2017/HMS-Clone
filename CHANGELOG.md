# Changelog

All notable changes to this project are documented in this file.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]
### Added
- **Accountant Dashboard module, all 20 screens/views implemented end-to-end:**
  - Added new pages: `Dashboard.tsx`, `BillingPage.tsx`, `PaymentsPage.tsx`, `ClaimsPage.tsx`, `PayrollPage.tsx`, `ExpensesPage.tsx`, `AnalyticsPage.tsx`, `AuditLogsPage.tsx`, and a custom `SettingsPage.tsx` under `client/src/pages/accountant/`.
  - Expanded frontend routes under `/accountant` inside `client/src/router.tsx` to mount all 9 pages.
  - Authorized `"accountant"` role on backend endpoints in `invoiceRoutes.ts`, `receptionRoutes.ts`, `doctorRoutes.ts`, and `staffRoutes.ts` to enable correct data loading (fixing stuck loading state for payroll employee list).
  - Integrated local persistence (LocalStorage) for payroll, expenses, insurance claims, tax rates, and active payment channel preferences to maintain a fully interactive state.
  - Fixed alignment and table header background clipping on scroll by shifting table backgrounds from row elements to header tags (`thead`), specifying minimum table widths, and adding `whitespace-nowrap` classes to prevent header text from wrapping onto two lines.
  - Aligned dashboard layout structure and replaced custom metrics cards with the reusable `KpiCard` component for unified, clean aesthetics.
  - Normalized uppercase styling in billing categories ("Pharmacy Billing", "Laboratory Billing").
  - Simplified table views in Billing, Payments, and Claims pages by removing less critical columns (e.g. Insurance Covered, Patient Balance, Transaction ID, Policy Number, Invoice Ref) to keep tables clean, and relocated them into their respective modal detail views.
  - Standardized status badge sizes (`w-36` / width: 9rem) across all Accountant tables and dashboards for unified, clean grid structures.
  - Redesigned Badge component styling to use rounded rectangle corners (`rounded-lg`) instead of full rounded pills, adding border outline accents and uppercase text format for a clean, premium, and neat appearance.
  - Arranged Claims and Expenses tables for cleaner responsive structures, resolving data multi-line wrapping by converting double-line fields (e.g. patient name/phone, recipient/description) into single-line formats, and implemented a detail view modal for expenses.
  - Removed unnecessary columns (Approved Amount from Claims list, Payment Method from Expenses list) to prevent horizontal scrolling on typical screen layouts, with full details accessible inside the detailed modals.
  - Added a `size="sm"` layout variant to the `KpiCard` component and applied it to the Accountant Dashboard KPI metrics to reduce padding, icon sizes, and typography sizes for a cleaner look.
  - Added Notification Panel integration into the Accountant dashboard topbar, sharing the admin's notification dropdown styles with real-time sync, and re-mapped internal links (billing, appointments, inventory) to relevant accountant paths.
- **Settings page** (`pages/shared/SettingsPage.tsx`) — shared across all three roles, accessible
  from the sidebar "Settings" item and by clicking the avatar/name in the Topbar. Contains a
  read-only profile card (name, email, role) and a Change Password form (new password + confirm,
  show/hide toggles, match indicator, loading state, success/error toast).
- **Change Password API** — `PATCH /api/v1/auth/change-password` (protected, all roles): validates
  that new and confirm passwords match, then bcrypt-hashes (cost 12) and persists the new hash.
  No current-password requirement, no strength restrictions — any non-empty password is accepted.
- **Notification overlay** (`components/ui/NotificationPanel.tsx`) — functional bell icon in the
  Topbar for `hospital_admin` only. Clicking opens a slide-in dropdown panel with real
  notifications sourced from live Mongo queries:
    - 🗓 **Appointments** scheduled today or tomorrow (status `scheduled`)
    - ⚠️ **Low/out-of-stock inventory** items where `stockQty ≤ reorderLevel`
    - 💳 **Overdue or past-due-pending invoices** (status `overdue` or `pending` with `dueDate`
      in the past)
    - 🧑‍⚕️ **New patients** registered in the last 24 hours
  Critical items sort to the top. Clicking any item navigates to that record's detail page and
  marks it read. Panel includes unread count badge, "Mark all as read", loading skeleton, empty
  state, Escape/outside-click dismissal, and auto-refreshes every 60 seconds via TanStack Query.
- **Notification API** — `GET /api/v1/notifications` (protected + `scopeToHospital`): runs 4
  parallel queries and returns a unified sorted array of `{ id, type, title, message, link,
  severity, createdAt }` objects.
- **Settings nav item** added to all three role sidebar nav arrays in `config/nav.ts`.
- **Topbar avatar/name** is now a clickable `<Link>` to the role-specific settings page
  (e.g. `/admin/settings`), with a small Settings icon beside the name.


- **Hospital Admin module, all 19 Figma screens implemented end-to-end:**
  - New `Doctor`, `Staff`, `Patient` (with embedded `medicalHistory`), `Appointment`,
    `InventoryItem`, `Invoice` models; `Department` gained `location`/`occupiedBeds` (now used for
    real bed-occupancy % everywhere, replacing the earlier honest-empty placeholder).
  - Full CRUD REST APIs for doctors (+ performance endpoint), staff (+ top-3 leaderboard),
    patients (+ medical-history entries), appointments (+ status workflow), inventory
    (+ computed critical/low/optimal stock status), invoices (+ computed subtotal/tax/insurance
    totals), all hard-scoped to `req.user.hospital` via `scopeToHospital` — verified two
    hospital_admins from different hospitals cannot see, fetch-by-id, or delete each other's data.
  - New `GET /api/v1/analytics/hospital` (real hospital-scoped counts incl. revenue from paid
    invoices and bed occupancy from department data).
  - `departments` and `roles` backend routes/frontend pages extended (not duplicated) to serve
    both `super_admin` and `hospital_admin` — same components, computed base path, conditionally
    hidden super_admin-only fields.
  - Matching frontend pages for every screen: Doctors (list/add/profile/performance), Patients
    (list/add/details-with-medical-history), Appointments (list/add/workflow-details with a
    real status-advance control), Staff (list/add), Departments (shared), Finance (dashboard +
    invoice create/detail with real computed billing totals), Inventory (list/add/item-details),
    Roles (shared) — plus `features/*.ts` TanStack Query hooks per resource.
  - Cloudinary upload folders extended for doctor/staff profile photos (reusing the existing
    `FileUpload` component/endpoint from the Super Admin phase).
  - Seed script extended with one doctor/staff/patient/appointment/inventory item/invoice under
    the demo hospital.

### Changed
- Switched auth from an httpOnly cookie to a JWT returned from login and stored in
  `sessionStorage`, sent as `Authorization: Bearer <token>` (axios request interceptor). This lets
  different accounts be logged in simultaneously in different browser tabs/windows, which cookies
  can't do (they're shared across every tab of the same origin). Removed `cookie-parser` (unused
  now) and the cookie-setting helpers. Documented the resulting XSS trade-off in
  `KNOWLEDGE_BASE.md`.

### Added
- Real file uploads via Cloudinary: `POST /api/v1/uploads` (multer memory storage → Cloudinary,
  no temp files on disk), a reusable `FileUpload` component, and wiring for hospital logo/license
  (`HospitalFormPage`) and admin profile photo (`AdminFormPage`, shown in the Topbar avatar once
  set). `Hospital` gained `licenseUrl`, `User` gained `avatarUrl`. Verified with a real upload to
  the configured Cloudinary account end-to-end through the actual form.
- Auto-bootstrap of the first `super_admin` account on server startup when the `User` collection
  is empty, using `SUPER_ADMIN_NAME` / `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from
  `server/.env` (`server/src/utils/ensureSuperAdmin.ts`). The demo seed script now reuses the same
  env values for its super_admin instead of a hardcoded one.
- **Super Admin module, all 14 Figma screens implemented end-to-end:**
  - New `Branch`, `Department`, `Report` models; `Hospital` gained `bedCapacity`, `User` gained
    `title`/`phone`/`employeeId`.
  - Full CRUD REST APIs for hospitals, branches, departments, admins, plus read-only `roles` (3
    real roles with live assigned-user counts), `analytics/global` (real structural counts with
    honest `pending` flags for revenue/patient/appointment metrics we don't have data for yet), and
    `reports` (real CSV export of each registry, logged to the `Report` collection).
  - Matching frontend pages for every screen — Hospitals (list/add/edit/details), Branches
    (list/add/edit), Departments (grid/add/edit/full-metrics), Admins (list/add/edit, with a
    one-time temp-password reveal on creation), Manage Roles, Analytics (Recharts on real data),
    Reports — plus new shared UI primitives (`Field`, `FormSection`, `Pagination`) and
    `features/*.ts` TanStack Query hooks per resource.
  - Fixed a `Card` component bug (found via Playwright walkthrough of every new screen) where an
    emphasized navy KPI card rendered invisible white-on-white text because the component's default
    `bg-white` could win over a caller-supplied `bg-navy-700` depending on Tailwind's generated CSS
    order; `Card` now omits its default background whenever the caller passes one.
- Redesigned the public landing page with current SaaS design patterns (sticky blurred nav,
  gradient-mesh hero with a dashboard-preview mockup, bento-grid features, elevated role cards, CTA
  band, multi-column footer) and verified it fully responsive with no horizontal scroll from 375px
  phones through 1920px+ screens (new `xs: 400px` Tailwind breakpoint, `max-w-[1600px]` content cap
  for ultra-wide/TV).

### Changed
- Split `client` and `server` into fully independent apps: removed the root `package.json`,
  root lockfile, and root `node_modules` (npm workspaces + `concurrently`). Each app now has its
  own dependencies and is started with its own `npm install` / `npm run dev` in a separate
  terminal — no shared tooling at the repo root.
- `npm run seed` now also wipes `Branch`/`Department`/`Report` and seeds one sample branch and
  department, so the Super Admin screens have real data immediately after seeding.

## [0.1.0] - 2026-07-08
### Added
- Initial monorepo scaffold (npm workspaces: `server`, `client`) with TypeScript on both sides.
- Express + Mongoose backend: local MongoDB connection, `User` and `Hospital` models, centralized
  error handler, health check endpoint.
- Authentication: email/password login, JWT issued as an httpOnly cookie, `protect` /
  `restrictTo` / `scopeToHospital` middleware for role- and tenant-based access control across
  the three roles (`super_admin`, `hospital_admin`, `accountant`).
- Seed script (`npm run seed`) creating one demo account per role plus a sample hospital.
- React + Vite + Tailwind frontend: shared UI kit (Button, Card, KpiCard, ChartCard, DataTable,
  Badge, Modal, Sidebar, Topbar), role-guarded router, `AuthContext` backed by `GET /auth/me`.
- Public landing page promoting the platform, and a login page — both designed fresh to match the
  Figma dashboards' navy/white visual language (these two pages were not present in the source
  Figma file).
- Dashboard shells for all three roles (Super Admin, Hospital Admin, Accountant) with KPI cards
  reflecting the Figma designs, ready to be wired to real data in upcoming modules.
- Project documentation: `KNOWLEDGE_BASE.md`.

### Notes
- Super Admin, Hospital Admin, and Accountant modules (hospitals/branches/departments, doctors/
  patients/appointments/inventory, billing/payroll/claims/expenses respectively) are the next
  phases — current dashboards show static KPI shells, not live data yet.
