import { Link } from "react-router-dom";
import {
  Building2,
  Stethoscope,
  Receipt,
  ShieldCheck,
  BarChart3,
  Users2,
  ArrowRight,
  LayoutDashboard,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "../../components/ui/Button";

const STATS = [
  { value: "3", label: "Role-based dashboards" },
  { value: "50+", label: "Operational workflows" },
  { value: "100%", label: "Role-scoped data access" },
  { value: "24/7", label: "Real-time network visibility" },
];

const FEATURES = [
  {
    icon: Building2,
    title: "Multi-Hospital Control",
    description: "Onboard hospitals and branches, and monitor your entire network from one enterprise dashboard.",
    span: "sm:col-span-2",
  },
  {
    icon: Stethoscope,
    title: "Clinical Operations",
    description: "Manage doctors, patients, appointments, and departments with real-time visibility.",
    span: "",
  },
  {
    icon: Receipt,
    title: "Billing & Payroll",
    description: "Automate invoicing, insurance claims, payments, and staff payroll processing.",
    span: "",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Track network growth and performance KPIs with live charts and CSV exports.",
    span: "",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description: "Purpose-built, permission-scoped dashboards for Super Admins, Hospital Admins, and Accountants.",
    span: "sm:col-span-2",
  },
  {
    icon: Users2,
    title: "Patient Experience",
    description: "A dedicated patient mobile app keeps appointments, records, and bills a tap away.",
    span: "",
  },
];

const ROLES = [
  { label: "Super Admin", description: "Oversees every hospital, branch, and admin across the network.", icon: Building2 },
  { label: "Hospital Admin", description: "Runs day-to-day operations for a single hospital.", icon: Stethoscope },
  { label: "Accountant", description: "Handles billing, payroll, claims, and financial reporting.", icon: Receipt },
];

export function LandingPage() {
  return (
    <div className="flex flex-col overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 xs:px-6 sm:px-8 lg:px-12">
          <div className="text-lg font-bold text-navy-700 xs:text-xl">HMS Enterprise</div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-navy-700">
              Features
            </a>
            <a href="#roles" className="hover:text-navy-700">
              Roles
            </a>
          </nav>
          <Link to="/login">
            <Button variant="primary">Login</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px]">
        {/* Hero */}
        <section className="relative px-4 pb-16 pt-14 xs:px-6 sm:px-8 sm:pt-20 lg:px-12 lg:pt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-navy-200/50 blur-3xl xs:h-96 xs:w-96 lg:right-[5%]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-[-10%] top-40 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl lg:top-64"
          />

          <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="text-center lg:text-left">
              <span className="inline-block rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy-700">
                Hospital Management, Unified
              </span>
              <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 xs:text-4xl sm:text-5xl lg:text-[3.25rem]">
                One platform to run your entire hospital network
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base text-slate-600 xs:text-lg lg:mx-0">
                HMS Enterprise brings hospitals, doctors, patients, billing, and reporting together in a
                single, role-aware system built for administrators, hospital staff, and finance teams.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 xs:flex-row xs:justify-center lg:justify-start">
                <Link to="/login" className="w-full xs:w-auto">
                  <Button variant="primary" className="w-full justify-center px-6 py-3 text-base xs:w-auto">
                    Login to Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features" className="w-full xs:w-auto">
                  <Button variant="secondary" className="w-full justify-center px-6 py-3 text-base xs:w-auto">
                    See Features
                  </Button>
                </a>
              </div>
            </div>

            {/* Dashboard preview mockup */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <div className="ml-3 flex flex-1 items-center gap-2 rounded-md bg-slate-100 px-2 py-1">
                    <Search className="h-3 w-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400">Search hospitals, doctors...</span>
                  </div>
                  <Bell className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="flex">
                  <div className="hidden w-16 flex-col items-center gap-4 border-r border-slate-100 bg-slate-50 py-4 xs:flex">
                    <LayoutDashboard className="h-4 w-4 text-navy-700" />
                    <Building2 className="h-4 w-4 text-slate-300" />
                    <Users2 className="h-4 w-4 text-slate-300" />
                    <Receipt className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="flex-1 space-y-3 p-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 rounded-lg bg-navy-700 p-3">
                        <div className="text-[9px] font-semibold uppercase tracking-wide text-navy-100">Revenue</div>
                        <div className="mt-2 h-2 w-16 rounded bg-white/40" />
                      </div>
                      <div className="rounded-lg bg-slate-100 p-3">
                        <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Beds</div>
                        <div className="mt-2 h-2 w-8 rounded bg-slate-300" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-end gap-1.5">
                        {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
                          <div key={i} className="w-full rounded-t bg-navy-200" style={{ height: `${h * 0.4}px` }} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded bg-slate-100" />
                      <div className="h-2 w-4/5 rounded bg-slate-100" />
                      <div className="h-2 w-3/5 rounded bg-slate-100" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y border-slate-100 bg-slate-50/60 px-4 py-10 xs:px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 gap-6 text-center lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-navy-700 xs:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-slate-500 xs:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Bento features */}
        <section id="features" className="scroll-mt-20 px-4 py-16 xs:px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 xs:text-3xl">Everything your hospital network needs</h2>
            <p className="mt-3 text-slate-600">
              A cohesive design system across every module — no bolted-on tools, no data silos.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${feature.span}`}
              >
                <div className="mb-4 inline-flex rounded-xl bg-navy-50 p-3 text-navy-700 transition-colors group-hover:bg-navy-700 group-hover:text-white">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-20 bg-slate-50/60 px-4 py-16 xs:px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 xs:text-3xl">Built for every role</h2>
            <p className="mt-3 text-slate-600">Each dashboard is scoped to exactly what that role needs to see.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {ROLES.map((role) => (
              <div
                key={role.label}
                className="rounded-2xl bg-navy-700 p-6 text-white transition-transform hover:-translate-y-1"
              >
                <span className="inline-flex rounded-xl bg-white/10 p-2.5">
                  <role.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{role.label}</h3>
                <p className="mt-2 text-sm text-navy-100">{role.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="px-4 py-16 xs:px-6 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 px-6 py-12 text-center text-white sm:px-12">
            <h2 className="text-2xl font-bold xs:text-3xl">Ready to bring your network onto one platform?</h2>
            <p className="max-w-xl text-navy-100">
              Sign in with your Super Admin, Hospital Admin, or Accountant credentials to get started.
            </p>
            <Link to="/login">
              <Button variant="secondary" className="bg-white px-6 py-3 text-base">
                Login to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-10 xs:px-6 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="text-lg font-bold text-navy-700">HMS Enterprise</div>
            <p className="mt-2 text-sm text-slate-500">Unified hospital management for the whole network.</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <a href="#features" className="hover:text-navy-700">
                  Features
                </a>
              </li>
              <li>
                <a href="#roles" className="hover:text-navy-700">
                  Roles
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-navy-700">
                  Login
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="text-slate-400">About</li>
              <li className="text-slate-400">Contact</li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Legal</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="text-slate-400">Privacy</li>
              <li className="text-slate-400">Terms</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-[1600px] border-t border-slate-100 pt-6 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} HMS Enterprise. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
