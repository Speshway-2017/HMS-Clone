import { useState, useEffect, FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_HOME_PATH } from "../../types/auth";
import { usePublicHospital } from "../../features/hospitals";
import {
  ShieldCheck,
  Lock,
  Mail,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  Activity,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  Check,
} from "lucide-react";

export function LoginPage() {
  const { user, login } = useAuth();
  const { data: hospital } = usePublicHospital();
  const hospitalName =
    hospital?.name ||
    (typeof window !== "undefined" ? localStorage.getItem("hms_hospital_name") : null) ||
    "Preethi Fertility Centre & Women's Clinic";
  const logoUrl =
    hospital?.logoUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("hms_hospital_logo") : null) ||
    "/preethi_logo.jpg";

  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [activeHighlightIdx, setActiveHighlightIdx] = useState(0);
  const highlights = [
    {
      title: "Clinical Role Isolation",
      desc: "Strict cryptographic and architectural boundaries protecting Super Admin, Facility Admin, Clinician, and Patient consoles.",
    },
    {
      title: "Real-Time Telemetry & Sync",
      desc: "Sub-20ms instant live synchronization for OPD queues, IP admissions, ward bed census, and pharmacy dispensing.",
    },
    {
      title: "HIPAA & Clinical Standards",
      desc: "End-to-end encrypted maternal, reproductive, and outpatient health records with comprehensive audit logging.",
    },
  ];

  useEffect(() => {
    document.title = `${hospitalName} | Sign In`;
    if (logoUrl) {
      let favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.getElementsByTagName("head")[0].appendChild(favicon);
      }
      favicon.href = logoUrl;
    }

    const blockedMsg = sessionStorage.getItem("desktop_blocked_message");
    if (blockedMsg) {
      setError(blockedMsg);
      sessionStorage.removeItem("desktop_blocked_message");
    }
  }, [hospitalName, logoUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHighlightIdx((prev) => (prev + 1) % highlights.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get("redirect");

  if (user && !isSubmitting && !isSuccess) {
    const redirectTo = redirectParam || (location.state as { from?: string })?.from || ROLE_HOME_PATH[user.role] || "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const cleanId = identifier.trim();

    if (!cleanId) {
      setError("Email address or phone number is required.");
      return;
    }
    if (cleanId.length > 100) {
      setError("Email address or phone number cannot exceed 100 characters.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const authUser = await login(cleanId, password);
      setIsSuccess(true);
      const targetPath = redirectParam || ROLE_HOME_PATH[authUser.role] || "/";
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Authentication failed. Please verify your credentials.";
      setError(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#f8faf9] font-sans overflow-x-hidden selection:bg-emerald-600 selection:text-white">
      {/* ── LEFT HERO PANEL: Clinical Identity & Trust (Visible on lg+) ──────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#041a10] via-[#093522] to-[#041910] p-8 xl:p-12 lg:w-[440px] xl:w-[480px] shrink-0 min-h-screen overflow-hidden text-white border-r border-emerald-900/40 shadow-2xl">
        {/* Ambient Medical Glow Orbs */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 bottom-1/4 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute right-10 bottom-10 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        {/* Ambient Subtle Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Top Header: Brand Identity */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3.5 group">
            <div className="relative">
              <img
                src={logoUrl}
                alt={hospitalName}
                className="h-11 w-11 rounded-xl object-contain bg-white p-1.5 border border-emerald-400/40 shadow-lg group-hover:scale-105 transition-transform"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/preethi_logo.jpg";
                }}
              />
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#093522]" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-base xl:text-lg tracking-tight leading-snug group-hover:text-emerald-200 transition-colors">
                {hospitalName}
              </span>
              <span className="text-xs font-semibold text-emerald-300/90 tracking-wide flex items-center gap-1.5 mt-0.5">
                <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
                Hospital Management System
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Mission Statement & Live Governance Cards */}
        <div className="my-auto py-8 space-y-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold tracking-wide">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Healthcare Information System</span>
            </div>
            <h2 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Clinical Excellence. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-100 to-rose-200">
                Compassionate Care.
              </span>
            </h2>
            <p className="text-xs leading-relaxed text-emerald-100/80 max-w-sm font-normal">
              Integrated hospital operating matrix connecting outpatient frontdesks, clinical doctor workstations, inpatient ward stations, and pharmacy dispensing.
            </p>
          </div>

          {/* Feature Highlight Card */}
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/40 p-4 backdrop-blur-md shadow-inner transition-all duration-300">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> System Architecture
              </span>
              <div className="flex items-center gap-1">
                {highlights.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveHighlightIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === activeHighlightIdx ? "w-4 bg-emerald-400" : "w-1.5 bg-emerald-700/60"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
            <h4 className="text-xs font-bold text-white tracking-tight">
              {highlights[activeHighlightIdx].title}
            </h4>
            <p className="mt-1 text-xs text-emerald-200/80 leading-relaxed min-h-[36px]">
              {highlights[activeHighlightIdx].desc}
            </p>
          </div>

          {/* Security & Accreditation Metrics */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs text-emerald-100/90 font-medium">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>HIPAA Isolation</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>AES-256 Security</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 pt-4 border-t border-emerald-800/40 flex items-center justify-between text-xs text-emerald-300/70">
          <span>© {new Date().getFullYear()} {hospitalName}. All rights reserved.</span>
        </div>
      </div>

      {/* ── RIGHT PANEL: Single Simple Login Box with Role-Based Redirection ───────────── */}
      <div className="flex-1 flex flex-col justify-between min-h-screen p-4 sm:p-8 lg:p-12 overflow-y-auto">
        {/* Top Bar Navigation */}
        <div className="w-full max-w-[420px] mx-auto flex items-center justify-between mb-4 sm:mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Public Website</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Online</span>
          </div>
        </div>

        {/* Central Clean Login Card */}
        <div className="w-full max-w-[420px] mx-auto my-auto">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6">
            {/* Mobile Branding Header */}
            <div className="lg:hidden flex items-center gap-3 pb-4 border-b border-slate-100">
              <img
                src={logoUrl}
                alt={hospitalName}
                className="h-10 w-10 rounded-xl object-contain bg-white p-1 border border-emerald-500/30 shadow-xs"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/preethi_logo.jpg";
                }}
              />
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-900 leading-tight">
                  {hospitalName}
                </span>
                <span className="text-[11px] font-medium text-emerald-700">
                  Hospital Management System
                </span>
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Sign In to Dashboard
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Enter your authorized staff or patient credentials to access your console.
              </p>
            </div>

            {/* Error Notification Alert */}
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-800 leading-normal animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Single Unified Login Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Field 1: Identifier */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Email Address or Mobile Number
                </label>
                <div className="relative rounded-xl border border-slate-300 bg-white shadow-2xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    maxLength={100}
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter email or mobile number"
                    className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none rounded-xl"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Security Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative rounded-xl border border-slate-300 bg-white shadow-2xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    maxLength={100}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter password"
                    className="w-full bg-transparent pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded"
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className="w-full relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 shadow-md shadow-emerald-900/10 disabled:opacity-75 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-200" />
                      <span>Success! Redirecting...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 text-emerald-200" />
                      <span>Sign In to Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Bottom Footer: New Patient Registration */}
            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              <span>New Patient? </span>
              <Link
                to="/register"
                className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
              >
                Register for Patient Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom copyright placeholder */}
        <div className="w-full max-w-[420px] mx-auto text-center text-[11px] text-slate-400 pt-4">
          <span>Protected by Enterprise Healthcare Security & Audit Controls.</span>
        </div>
      </div>
    </div>
  );
}
