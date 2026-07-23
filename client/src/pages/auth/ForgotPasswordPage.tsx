import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { usePublicHospital } from "../../features/hospitals";
import { api } from "../../lib/api";
import { ShieldCheck, Activity, ArrowLeft, CheckCircle2 } from "lucide-react";

export function ForgotPasswordPage() {
  const { user } = useAuth();
  const { data: hospital } = usePublicHospital();
  const hospitalName = hospital?.name || "HMS Enterprise";
  const logoUrl = hospital?.logoUrl;

  useEffect(() => {
    document.title = `${hospitalName} | Forgot Password`;
  }, [hospitalName]);

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to submit request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex w-full grid-cols-12 lg:grid">
        {/* --- LEFT PANEL: SaaS Info (Hidden on mobile) --- */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-navy-800 to-navy-950 p-12 text-white lg:col-span-5 lg:flex xl:col-span-4 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-navy-700/40 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-10 h-48 w-48 rounded-full bg-emerald-700/20 blur-2xl pointer-events-none" />

          {/* Logo Branding */}
          <Link to="/" className="flex items-center gap-3 text-lg font-extrabold tracking-tight relative z-10">
            {logoUrl ? (
              <img src={logoUrl} alt={hospitalName} className="h-8 w-8 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-750 text-white font-bold text-sm shadow-md border border-white/10">
                <Activity className="h-4 w-4" />
              </div>
            )}
            <span className="bg-gradient-to-r from-white to-navy-100 bg-clip-text text-transparent">
              {hospitalName}
            </span>
          </Link>

          <div className="my-auto space-y-8 relative z-10">
            <div className="space-y-4">
              <span className="inline-block rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-200">
                Security & Credential Recovery
              </span>
              <h2 className="text-3xl font-extrabold leading-tight">
                Recover Your Access Portal.
              </h2>
              <p className="text-sm leading-relaxed text-navy-100/90">
                Enter your registered administrator/staff email. We'll generate a secure, single-use, 15-minute reset token to help you safely update your password.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-6 text-xs text-navy-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Secure Cryptographic Tokens
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Automatic Expiration Enforcement
              </div>
            </div>
          </div>

          <div className="text-[10px] text-navy-300 relative z-10">
            © {new Date().getFullYear()} {hospitalName}. Managed Clinical Network.
          </div>
        </div>

        {/* --- RIGHT PANEL: Form --- */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:col-span-7 xl:col-span-8 bg-slate-50">
          <div className="mx-auto w-full max-w-[420px] space-y-8">
            <div className="text-center space-y-2 lg:text-left">
              <Link to="/" className="inline-flex lg:hidden items-center gap-2.5 text-xl font-extrabold text-navy-900 justify-center">
                {logoUrl && (
                  <img src={logoUrl} alt={hospitalName} className="h-8 w-8 rounded-lg object-cover" />
                )}
                <span>{hospitalName}</span>
              </Link>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Forgot Password
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                We'll email you instructions to safely reset your security credentials.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl">
              {success ? (
                <div className="space-y-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-900">Request Dispatched</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      If an account exists for <strong className="text-slate-700">{email}</strong>, a password reset link has been sent. Please check your inbox and spam folders.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-xs text-navy-600 hover:text-navy-800 font-bold hover:underline"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back to Sign In
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold text-slate-700">
                  <div>
                    <label htmlFor="email" className="block mb-1 text-xs text-slate-600">
                      Registered System Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 font-medium transition-all text-sm"
                      placeholder="name@hospital.com"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-650 font-bold leading-normal">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full font-bold py-2.5" disabled={isSubmitting}>
                    {isSubmitting ? "Dispatching..." : "Send Reset Link"}
                  </Button>

                  <div className="text-center pt-2 border-t border-slate-100">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-navy-700 font-bold hover:underline transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back to Sign In
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
