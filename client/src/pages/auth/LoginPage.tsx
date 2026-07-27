import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { ROLE_HOME_PATH } from "../../types/auth";
import { usePublicHospital } from "../../features/hospitals";
import { ShieldCheck, Lock, Activity, ArrowLeft, CheckCircle2, ChevronRight, Eye, EyeOff } from "lucide-react";

export function LoginPage() {
  const { user, login } = useAuth();
  const { data: hospital } = usePublicHospital();
  const hospitalName = hospital?.name || "HMS Enterprise";
  const logoUrl = hospital?.logoUrl;

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
  }, [hospitalName, logoUrl]);

  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rotate features or stats on the left panel
  const [activePromoIdx, setActivePromoIdx] = useState(0);
  const promos = [
    {
      title: "HIPAA Compliant Tenancy",
      desc: "All health records, laboratory orders, and invoices are protected by AES-256 databases and isolated per-hospital tenant.",
    },
    {
      title: "Role-Based Integrity",
      desc: "Workspaces specifically tailored for Super Admins, Hospital Admins, and Accountants. Only see the data you own.",
    },
    {
      title: "Unified Real-Time Sync",
      desc: "Monitor outpatient queues, bed occupancies, and billing updates instantly across all network branch portals.",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePromoIdx((prev) => (prev + 1) % promos.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  if (user) {
    const redirectTo = (location.state as { from?: string })?.from ?? ROLE_HOME_PATH[user.role] ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(ROLE_HOME_PATH[loggedInUser.role] ?? "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex w-full grid-cols-12 lg:grid">
        {/* --- LEFT PANEL: SaaS Info (Hidden on mobile) --- */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-navy-800 to-navy-950 p-12 text-white lg:col-span-5 lg:flex xl:col-span-4 overflow-hidden">
          {/* Background overlay shapes */}
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

          {/* Marketing rotating text */}
          <div className="my-auto space-y-10 relative z-10">
            <div className="space-y-4">
              <span className="inline-block rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-200">
                Enterprise Health Architecture
              </span>
              <h2 className="text-3xl font-extrabold leading-tight">
                One Platform. Seamless Compliance.
              </h2>
              <p className="text-sm leading-relaxed text-navy-100/90">
                HMS Enterprise integrates outpatient reception desks, clinician workspaces, and accountant audit ledgers into a unified clinical software matrix.
              </p>
            </div>

            {/* Carousel Promo */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md min-h-[120px] transition-all duration-300">
              <span className="text-[9px] font-bold text-emerald-450 uppercase tracking-widest block mb-1">
                SYSTEM BENEFIT
              </span>
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
                {promos[activePromoIdx].title}
              </h4>
              <p className="mt-2 text-xs text-navy-150 leading-relaxed">
                {promos[activePromoIdx].desc}
              </p>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-xs text-navy-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 100% HIPAA Isolated
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> AES-256 Encrypted
              </div>
            </div>
          </div>

          {/* Footer of Left Panel */}
          <div className="text-[10px] text-navy-300 relative z-10">
            © {new Date().getFullYear()} {hospitalName}. Managed Clinical Network.
          </div>
        </div>

        {/* --- RIGHT PANEL: Login Form --- */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:col-span-7 xl:col-span-8 bg-slate-50">
          <div className="mx-auto w-full max-w-[420px] space-y-8">
            {/* Header branding for mobile / small screen */}
            <div className="text-center space-y-2 lg:text-left">
              <Link to="/" className="inline-flex lg:hidden items-center gap-2.5 text-xl font-extrabold text-navy-900 justify-center">
                {logoUrl && (
                  <img src={logoUrl} alt={hospitalName} className="h-8 w-8 rounded-lg object-cover" />
                )}
                <span>{hospitalName}</span>
              </Link>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Sign In to Dashboard
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Enter your credentials registered by the Super Administrator.
              </p>
            </div>

            {/* Login Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold text-slate-700">
                {/* Email input */}
                <div>
                  <label htmlFor="email" className="block mb-1 text-xs text-slate-600">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 font-medium transition-all text-sm"
                    placeholder="name@hospital.com"
                  />
                </div>

                {/* Password input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="text-xs text-slate-600">
                      Security Password
                    </label>
                    <Link to="/forgot-password" className="text-[10px] text-navy-600 hover:text-navy-800 hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-3.5 pr-10 py-2.5 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 font-medium transition-all text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-650 font-bold leading-normal">
                    {error}
                  </div>
                )}

                {/* Action button */}
                <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full py-3.5 text-sm bg-navy-700 shadow-md">
                  {isSubmitting ? "Authenticating Session..." : "Secure Sign In"}
                </Button>
              </form>
            </div>

            {/* Back button */}
            <div className="text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-navy-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Marketing Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
