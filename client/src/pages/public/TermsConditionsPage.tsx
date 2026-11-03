import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, HeartPulse, FileText, CheckCircle2, Shield } from "lucide-react";

export function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-blue-900 font-extrabold text-lg">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <HeartPulse className="h-4 w-4" />
            </div>
            <span>HMS Enterprise</span>
          </Link>
          <Link
            to="/"
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-8 mb-10 shadow-xl relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-4 border border-blue-400/20">
            <FileText className="h-4 w-4 text-blue-400" />
            User Agreement & Healthcare Disclaimers
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Terms and Conditions</h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Please read these terms carefully before accessing or using the HMS Enterprise clinical application and services.
          </p>
        </div>

        {/* Emergency Disclaimer Banner */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 mb-8 text-red-900 text-xs flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-red-800 uppercase tracking-wide">Emergency Medical Disclaimer</p>
            <p className="leading-relaxed">
              This mobile application and web portal are NOT designed for real-time acute emergency response. If you are experiencing a life-threatening medical emergency, chest pain, difficulty breathing, or severe trauma, call local emergency services (112 / 911) or proceed immediately to the nearest hospital casualty emergency department.
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-2xl border border-slate-200/80 shadow-sm leading-relaxed text-sm">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" /> 1. Acceptance of Services
            </h2>
            <p className="text-slate-600">
              By accessing the HMS Enterprise mobile app or web portals, you agree to comply with and be bound by these Terms and our Privacy Policy. If you disagree with any portion of these terms, you are not authorized to use the platform.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" /> 2. User Accounts & Confidentiality
            </h2>
            <p className="text-slate-600">
              When creating an account:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>You agree to provide true, current, and complete personal and medical history details.</li>
              <li>You are solely responsible for safeguarding your login credentials and preventing unauthorized access to your account.</li>
              <li>Hospital staff and clinicians may only access patient records in connection with legitimate diagnosis, clinical care, and hospital operations.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Appointments & Prescriptions</h2>
            <p className="text-slate-600">
              Prescriptions, diagnostic test requests, and appointment queues displayed in the app reflect digital entries by authorized hospital medical personnel. Medication schedules and instructions must be followed under the supervision of your licensed physician.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Account Termination & Deletion</h2>
            <p className="text-slate-600">
              You may terminate your patient account at any time through the in-app profile menu or through our <Link to="/delete-account" className="text-blue-600 font-bold hover:underline">Web Deletion Request Page</Link>. In compliance with healthcare regulations, past clinical treatment records remain securely preserved per statutory retention periods.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Contact Information</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1 text-slate-700">
              <p><strong>Support Email:</strong> support@speshway.site</p>
              <p><strong>System:</strong> HMS Enterprise Healthcare Matrix</p>
              <p><strong>Domain:</strong> https://cms.speshway.site</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} HMS Enterprise. All rights reserved.
      </footer>
    </div>
  );
}

