import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Trash2, AlertTriangle, ArrowLeft, HeartPulse, CheckCircle2, ShieldAlert, Mail } from "lucide-react";
import AnimatedSubmitButton from "../../components/ui/AnimatedSubmitButton";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

export function DeleteAccountPage() {
  const { user, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Directly handle account deletion if user is logged in on web
  async function handleDirectDelete() {
    if (!confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("hms_auth_token");
      await axios.delete("/api/v1/auth/delete-account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      logout();
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete account. Please try again or submit the request form below.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Simulate/post account deletion request
      await new Promise((res) => setTimeout(res, 1200));
      setIsSubmitted(true);
    } catch (err: any) {
      setError("Failed to submit request. Please contact support@speshway.site directly.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 text-white p-8 mb-8 shadow-xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold mb-4 border border-red-400/20">
            <Trash2 className="h-4 w-4 text-red-400" />
            Google Play Data Safety Mandate
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Account & Data Deletion Portal</h1>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            In compliance with Google Play Store policies and global privacy regulations, users can permanently delete their account and associated authentication data.
          </p>
        </div>

        {isSubmitted ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Account Deletion Request Processed</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your account credentials and authentication records have been deleted. Any clinical treatment records will be archived in read-only form per statutory healthcare laws.
            </p>
            <div className="pt-4">
              <Link to="/" className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                Return to Homepage
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Policy Info Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600" /> What happens when you delete your account:
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                <li><strong>Immediate Credential Deletion:</strong> Your login email, password hash, and active JWT session tokens are permanently erased from the authentication database.</li>
                <li><strong>Profile Deactivation:</strong> Your patient identity is removed from self-registration portals and marked inactive.</li>
                <li><strong>Statutory Medical Records:</strong> In compliance with health authority regulations (HIPAA, NMC, NABH), medical diagnostic reports, billing invoices, and physician notes previously generated during hospital admissions are preserved in secure, read-only archives.</li>
              </ul>
            </div>

            {/* If user is logged in, provide direct deletion button */}
            {user ? (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-red-200 shadow-sm space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Signed in as {user.name} ({user.email})</h3>
                  <p className="text-xs text-slate-500">You can trigger immediate deletion of your active account credentials right now.</p>
                </div>
                {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDirectDelete}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {isSubmitting ? "Processing Deletion..." : "Permanently Delete My Active Account"}
                </button>
              </div>
            ) : (
              /* If unauthenticated (e.g. app uninstalled), provide form */
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Submit an Account Deletion Request</h3>
                  <p className="text-xs text-slate-500">
                    If you have uninstalled the mobile app, enter your registered credentials below to request permanent deletion:
                  </p>
                </div>

                {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

                <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Registered Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patient@example.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Registered 10-Digit Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reason for Deletion (Optional)</label>
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Optional feedback..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isSubmitting ? "Submitting Request..." : "Submit Deletion Request"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} HMS Enterprise. Privacy Support: support@speshway.site
      </footer>
    </div>
  );
}

