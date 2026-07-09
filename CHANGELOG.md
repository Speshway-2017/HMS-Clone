# Changelog

All notable changes to this project are documented in this file.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]
### Added
- Auto-bootstrap of the first `super_admin` account on server startup when the `User` collection
  is empty, using `SUPER_ADMIN_NAME` / `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from
  `server/.env` (`server/src/utils/ensureSuperAdmin.ts`). The demo seed script now reuses the same
  env values for its super_admin instead of a hardcoded one.

### Changed
- Split `client` and `server` into fully independent apps: removed the root `package.json`,
  root lockfile, and root `node_modules` (npm workspaces + `concurrently`). Each app now has its
  own dependencies and is started with its own `npm install` / `npm run dev` in a separate
  terminal — no shared tooling at the repo root.

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
