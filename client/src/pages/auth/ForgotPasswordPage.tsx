import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { usePublicHospital } from "../../features/hospitals";
import { api } from "../../lib/api";
import { isValidEmail, MAX_LENGTHS } from "../../lib/validation";
import { ShieldCheck, Activity, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export function ForgotPasswordPage() {
  const { user } = useAuth();
  const { data: hospital } = usePublicHospital();
  const hospitalName = hospital?.name || "HMS Enterprise";
  const logoUrl = hospital?.logoUrl;

  useEffect(() => {
    document.title = `${hospitalName} | Forgot Password`;
  }, [hospitalName]);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmailValue = (val: string): string | null => {
    const cleaned = (val || "").trim();
    if (!cleaned) {
      return "Email address is required.";
    }
    if (cleaned.length > MAX_LENGTHS.EMAIL) {
      return `Email address cannot exceed ${MAX_LENGTHS.EMAIL} characters.`;
    }
    if (!isValidEmail(cleaned)) {
      return "Please enter a valid email address (e.g. name@hospital.com).";
    }
    return null;
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (emailTouched) {
      setEmailError(validateEmailValue(val));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmailValue(email));
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setEmailTouched(true);

    const validationErr = validateEmailValue(email);
    setEmailError(validationErr);

    if (validationErr) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
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
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-12 text-white lg:col-span-5 lg:flex xl:col-span-4 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

          {/* Logo Branding */}
          <Link to="/" className="flex items-center gap-3 text-lg font-extrabold tracking-tight relative z-10">
            <img
              src={logoUrl || "/hospital-logo.svg"}
              alt=""
              className="h-8 w-8 rounded-lg object-cover shadow-sm bg-white/10"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/hospital-logo.svg";
              }}
            />
            <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              {hospitalName}
            </span>
          </Link>

          <div className="my-auto space-y-8 relative z-10">
            <div className="space-y-4">
              <span className="inline-block rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Security & Credential Recovery
              </span>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
                Recover Your Access Portal.
              </h2>
              <p className="text-sm leading-relaxed text-slate-300">
                Enter your registered administrator/staff email. We'll generate a secure, single-use, 15-minute reset token to help you safely update your password.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Secure Cryptographic Tokens
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Automatic Expiration Enforcement
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 relative z-10">
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
                <form onSubmit={handleSubmit} noValidate className="space-y-5 text-xs font-semibold text-slate-700">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="email" className="block text-xs text-slate-600 font-semibold">
                        Registered System Email <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-mono ${email.length >= 240 ? "text-amber-600 font-bold" : "text-slate-400"}`}>
                        {email.length}/254
                      </span>
                    </div>
                    <input
                      id="email"
                      type="email"
                      maxLength={254}
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onBlur={handleEmailBlur}
                      className={`w-full rounded-lg border px-3.5 py-2.5 outline-none font-medium transition-all text-sm ${
                        emailTouched && emailError
                          ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                          : "border-slate-300 focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                      }`}
                      placeholder="name@hospital.com"
                    />
                    {emailTouched && emailError && (
                      <p className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{emailError}</span>
                      </p>
                    )}
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
