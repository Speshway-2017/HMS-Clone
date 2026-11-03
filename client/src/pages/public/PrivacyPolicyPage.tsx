import { Link } from "react-router-dom";
import { ShieldCheck, Lock, Eye, ArrowLeft, HeartPulse, FileText, CheckCircle2 } from "lucide-react";

export function PrivacyPolicyPage() {
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
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            Google Play Data Safety & HIPAA Compliant
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Effective Date: November 2026. This Privacy Policy outlines how HMS Enterprise collects, encrypts, and protects patient and staff information across mobile and web clinical platforms.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-2xl border border-slate-200/80 shadow-sm leading-relaxed text-sm">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" /> 1. Information We Collect
            </h2>
            <p className="text-slate-600">
              To provide clinical record access, outpatient token queues, and diagnostic delivery, we collect:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Personal Identifiers:</strong> Full legal name, verified mobile number, email address, residential address, age, and gender.</li>
              <li><strong>Clinical Demographics:</strong> Unique Hospital Identification (UHID), blood group, known drug allergies, insurance provider & policy number, and emergency nominee contact details.</li>
              <li><strong>User-Supplied Photos:</strong> Identification photos captured via camera or selected from device photo storage for the patient profile.</li>
              <li><strong>Technical Metadata:</strong> Network connectivity state and secure session tokens for encrypted authentication.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" /> 2. Camera & Photo Storage Permissions
            </h2>
            <p className="text-slate-600">
              Our Android mobile app requests Camera (<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">android.permission.CAMERA</code>) and Photo Storage access strictly for patient identification portrait uploads.
            </p>
            <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-4 text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-600" /> Prominent Disclosure Commitment:
              </p>
              <p className="text-blue-800">
                Media files are uploaded only upon your direct in-app action. We do not access background media or scan external folders. Permissions can be revoked anytime in Android Settings.
              </p>
            </div>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" /> 3. Data Protection & Security Architecture
            </h2>
            <p className="text-slate-600">
              All healthcare data is protected under enterprise-grade protocols:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>In-Transit Encryption:</strong> All data transmitted between user clients and <code>cms.speshway.site</code> utilizes TLS 1.3 encryption.</li>
              <li><strong>At-Rest Encryption:</strong> Health records, passwords, and sensitive tokens are encrypted using AES-256 ciphers.</li>
              <li><strong>Access Control:</strong> Strict role-based isolation ensures clinical records are accessible solely to licensed hospital clinicians and authorized staff.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> 4. Mandatory Account & Data Deletion
            </h2>
            <p className="text-slate-600">
              In strict accordance with Google Play Store User Data & Data Safety mandates, users possess the right to permanently delete their account:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>In-App Deletion:</strong> In the mobile application, navigate to <em>Patient Profile &gt; Delete My Account</em> to immediately wipe credentials and deactivate the profile.</li>
              <li><strong>Web Deletion Request:</strong> If you no longer have the app installed, submit a deletion request via our public <Link to="/delete-account" className="text-blue-600 font-bold hover:underline">Account Deletion Portal</Link>.</li>
            </ul>
            <p className="text-xs text-slate-500 italic mt-2">
              *Note: Historical prescriptions, lab reports, and financial invoices are archived in read-only form strictly to comply with mandatory statutory hospital and medical record retention regulations.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Contact Information</h2>
            <p className="text-slate-600">
              For any questions regarding this Privacy Policy or your clinical records, contact our Privacy Compliance Officer:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1 text-slate-700">
              <p><strong>Email:</strong> support@speshway.site</p>
              <p><strong>Website:</strong> https://cms.speshway.site</p>
              <p><strong>Entity:</strong> HMS Enterprise Healthcare Network</p>
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

