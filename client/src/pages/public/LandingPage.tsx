import { Link } from "react-router-dom";
import { Building2, Stethoscope, Receipt, ShieldCheck, BarChart3, Users2 } from "lucide-react";
import { Button } from "../../components/ui/Button";

const FEATURES = [
  {
    icon: Building2,
    title: "Multi-Hospital Control",
    description: "Onboard hospitals and branches, and monitor your entire network from one enterprise dashboard.",
  },
  {
    icon: Stethoscope,
    title: "Clinical Operations",
    description: "Manage doctors, patients, appointments, and departments with real-time visibility.",
  },
  {
    icon: Receipt,
    title: "Billing & Payroll",
    description: "Automate invoicing, insurance claims, payments, and staff payroll processing.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Track revenue, occupancy, and performance KPIs with live charts and exportable reports.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description: "Purpose-built dashboards for Super Admins, Hospital Admins, and Accountants.",
  },
  {
    icon: Users2,
    title: "Patient Experience",
    description: "A dedicated patient mobile app keeps appointments, records, and bills a tap away.",
  },
];

const ROLES = [
  { label: "Super Admin", description: "Oversees every hospital, branch, and admin across the network." },
  { label: "Hospital Admin", description: "Runs day-to-day operations for a single hospital." },
  { label: "Accountant", description: "Handles billing, payroll, claims, and financial reporting." },
];

export function LandingPage() {
  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="text-xl font-bold text-navy-700">HMS Enterprise</div>
        <Link to="/login">
          <Button variant="primary">Login</Button>
        </Link>
      </header>

      <section className="px-6 py-16 text-center sm:px-12 sm:py-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          One platform to run your entire hospital network
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          HMS Enterprise brings hospitals, doctors, patients, billing, and reporting together in a single,
          role-aware system built for administrators, hospital staff, and finance teams.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login">
            <Button variant="primary" className="px-6 py-3 text-base">
              Login to Dashboard
            </Button>
          </Link>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-16 sm:px-12">
        <h2 className="text-center text-2xl font-bold text-slate-900">Everything your hospital network needs</h2>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-4 inline-flex rounded-lg bg-navy-50 p-2.5 text-navy-700">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-16 sm:px-12">
        <h2 className="text-center text-2xl font-bold text-slate-900">Built for every role</h2>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {ROLES.map((role) => (
            <div key={role.label} className="rounded-xl bg-navy-700 p-6 text-white">
              <h3 className="text-lg font-semibold">{role.label}</h3>
              <p className="mt-2 text-sm text-navy-100">{role.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8 text-center text-sm text-slate-500 sm:px-12">
        © {new Date().getFullYear()} HMS Enterprise. All rights reserved.
      </footer>
    </div>
  );
}
