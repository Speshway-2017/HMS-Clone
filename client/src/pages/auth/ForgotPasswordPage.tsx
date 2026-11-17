import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { usePublicHospital } from "../../features/hospitals";
import { api } from "../../lib/api";
import { isValidEmail, MAX_LENGTHS } from "../../lib/validation";
import { ShieldCheck, Activity, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export function ForgotPasswordPage() {
  const [persistedHospital] = useState<{ name: string; logoUrl: string }>(() => ({
    name: typeof window !== "undefined" ? localStorage.getItem("hms_hospital_name") || "" : "",
    logoUrl: typeof window !== "undefined" ? localStorage.getItem("hms_hospital_logo") || "" : "",
  }));

  const { user } = useAuth();
  const { data: hospital } = usePublicHospital();
  const hospitalName = hospital?.name || persistedHospital.name || "Preethi Fertility Centre & Women's Clinic";
  const logoUrl = hospital?.logoUrl || persistedHospital.logoUrl || "/preethi_logo.jpg";

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
        {/* --- LEFT PANEL: Branding & Info (Hidden on mobile) --- */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#041a10] via-[#093522] to-[#041910] p-12 text-white lg:col-span-5 lg:flex xl:col-span-4 overflow-hidden border-r border-emerald-900/40 shadow-2xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
          <div className="absolute right-10 bottom-10 h-48 w-48 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />

          {/* Ambient Subtle Grid Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Logo Branding */}
          <Link to="/" className="flex items-center gap-3.5 text-lg font-extrabold tracking-tight relative z-10 group">
            <div className="relative">
              <img
                src={logoUrl}
                alt={hospitalName}
                className="h-10 w-10 rounded-xl object-contain bg-white p-1 border border-emerald-400/40 shadow-lg group-hover:scale-105 transition-transform"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/preethi_logo.jpg";
                }}
              />
              <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#093522]" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-base tracking-tight leading-snug group-hover:text-emerald-200 transition-colors">
                {hospitalName}
              </span>
              <span className="text-[11px] font-semibold text-emerald-300/90 tracking-wide flex items-center gap-1.5 mt-0.5">
                <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
                Hospital Management System
              </span>
            </div>
          </Link>

          <div className="my-auto space-y-8 relative z-10">
            <div className="space-y-4">
              <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Security & Credential Recovery
              </span>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
                Recover Your Access Portal.
              </h2>
              <p className="text-sm leading-relaxed text-emerald-100/80">
                Enter your registered administrator/staff email. We'll generate a secure, single-use, 15-minute reset token to help you safely update your password.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-emerald-800/40 pt-6 text-xs text-emerald-100/90">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Secure Cryptographic Tokens
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Automatic Expiration Enforcement
              </div>
            </div>
          </div>

          <div className="text-[10px] text-emerald-300/70 border-t border-emerald-800/40 pt-3 relative z-10">
            © {new Date().getFullYear()} {hospitalName}. Managed Clinical Network.
          </div>
        </div>

        {/* --- RIGHT PANEL: Form --- */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:col-span-7 xl:col-span-8 bg-slate-50">
          <div className="mx-auto w-full max-w-[420px] space-y-8">
            <div className="text-center space-y-2 lg:text-left">
              <Link to="/" className="inline-flex lg:hidden items-center gap-2.5 text-xl font-extrabold text-emerald-900 justify-center">
                <img
                  src={logoUrl}
                  alt={hospitalName}
                  className="h-8 w-8 rounded-lg object-contain bg-white p-1 border border-emerald-500/30 shadow-xs"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/preethi_logo.jpg";
                  }}
                />
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
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-bold hover:underline"
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
                          : "border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
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
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold leading-normal flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full font-bold py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all" disabled={isSubmitting}>
                    {isSubmitting ? "Dispatching..." : "Send Reset Link"}
                  </Button>

                  <div className="text-center pt-2 border-t border-slate-100">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 font-bold hover:underline transition-colors"
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
