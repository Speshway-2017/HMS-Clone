import { useState, useEffect, FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AnimatedInput from "../../components/ui/AnimatedInput";
import AnimatedSubmitButton from "../../components/ui/AnimatedSubmitButton";
import SpringScaleIn from "../../components/ui/SpringScaleIn";
import { motion, AnimatePresence } from "motion/react";
import { ROLE_HOME_PATH } from "../../types/auth";
import { usePublicHospital } from "../../features/hospitals";
import { ShieldCheck, Lock, Mail, Activity, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get("redirect");

  if (user && !isSubmitting && !isSuccess) {
    const redirectTo = redirectParam || (location.state as { from?: string })?.from || ROLE_HOME_PATH[user.role] || "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setIsSuccess(false);

    try {
      const loggedInUser = await login(identifier.trim(), password);

      // Trigger green tick mark animation
      setIsSuccess(true);

      // Wait 2.2 seconds for full spin and green tick mark animation to show
      await new Promise((resolve) => setTimeout(resolve, 2200));

      if (sessionStorage.getItem("pendingAppointmentDraft") && loggedInUser.role === "patient") {
        navigate("/patient?tab=appointments", { replace: true });
        return;
      }

      const targetPath = redirectParam || (location.state as { from?: string })?.from || ROLE_HOME_PATH[loggedInUser.role] || "/";
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-50 font-sans">
      {/* --- LEFT PANEL: SaaS Info (Hidden on mobile) --- */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-8 lg:w-[360px] xl:w-[420px] shrink-0 h-full overflow-hidden text-white">
        {/* Background overlay shapes */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 bottom-10 h-48 w-48 rounded-full bg-blue-400/15 blur-2xl pointer-events-none" />

        {/* Logo Branding */}
        <Link to="/" className="flex items-center gap-3 text-lg font-extrabold tracking-tight relative z-10">
          {logoUrl ? (
            <img src={logoUrl} alt={hospitalName} className="h-8 w-8 rounded-lg object-cover shadow-sm" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm shadow-md border border-blue-400/20">
              <Activity className="h-4 w-4 text-blue-200" />
            </div>
          )}
          <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            {hospitalName}
          </span>
        </Link>

        {/* Marketing rotating text */}
        <div className="my-auto space-y-6 relative z-10 py-4">
          <div className="space-y-3">
            <span className="inline-block rounded-full bg-blue-500/10 border border-blue-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
              Enterprise Health Architecture
            </span>
            <h2 className="text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight text-white block">
              <SpringScaleIn delay={200} stagger={70}>
                One Platform. Seamless Compliance.
              </SpringScaleIn>
            </h2>
            <p className="text-xs leading-relaxed text-slate-300 block">
              <SpringScaleIn delay={500} stagger={30}>
                HMS Enterprise integrates outpatient reception desks, clinician workspaces, and accountant audit ledgers into a unified clinical software matrix.
              </SpringScaleIn>
            </p>
          </div>

          {/* Carousel Promo */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-900/20 p-4 backdrop-blur-md min-h-[110px] overflow-hidden">
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
              SYSTEM BENEFIT
            </span>
            <AnimatePresence mode="wait">
              <motion.div
                key={activePromoIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <h4 className="text-xs font-bold flex items-center gap-1.5 text-white">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  {promos[activePromoIdx].title}
                </h4>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  {promos[activePromoIdx].desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Quick trust metrics */}
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400" /> 100% HIPAA Isolated
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400" /> AES-256 Encrypted
            </div>
          </div>
        </div>

        {/* Footer of Left Panel */}
        <div className="text-[10px] text-slate-400 relative z-10">
          © {new Date().getFullYear()} {hospitalName}. Managed Clinical Network.
        </div>
      </div>

      {/* --- RIGHT PANEL: Login Form --- */}
      <div className="flex-1 h-full overflow-y-auto px-6 py-12 bg-slate-50 flex flex-col justify-center">
          <div className="mx-auto w-full max-w-[420px] space-y-8">
            {/* Header branding for mobile / small screen */}
            <div className="text-center space-y-2 lg:text-left">
              <Link to="/" className="inline-flex lg:hidden items-center gap-2.5 text-xl font-extrabold text-blue-900 justify-center">
                {logoUrl && (
                  <img src={logoUrl} alt={hospitalName} className="h-8 w-8 rounded-lg object-cover" />
                )}
                <span>{hospitalName}</span>
              </Link>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight block">
                <SpringScaleIn delay={100} stagger={80}>
                  Sign In to Dashboard
                </SpringScaleIn>
              </h3>
              <p className="text-xs text-slate-500 font-medium block">
                <SpringScaleIn delay={350} stagger={30}>
                  Enter your credentials or mobile number to access your account.
                </SpringScaleIn>
              </p>
            </div>

            {/* Login Card */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-xl transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-200/50 hover:-translate-y-1"
            >
              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
                {/* Email / Phone input with AnimatedInput */}
                <div>
                  <AnimatedInput
                    id="identifier"
                    icon={<Mail className="h-4 w-4 text-blue-500" />}
                    label="Email Address or Phone Number"
                    value={identifier}
                    onChange={setIdentifier}
                    required
                    autoComplete="username"
                  />
                </div>

                {/* Password input with AnimatedInput */}
                <AnimatedInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  icon={<Lock className="h-4 w-4 text-blue-500" />}
                  label="Security Password"
                  value={password}
                  onChange={setPassword}
                  required
                  autoComplete="current-password"
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="svg-button text-slate-400 hover:text-blue-600 focus:outline-none transition-colors"
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                {/* Error Banner */}
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-bold leading-normal">
                    {error}
                  </div>
                )}

                {/* Animated Submit Button */}
                <div className="space-y-3 pt-1">
                  <AnimatedSubmitButton
                    type="submit"
                    disabled={isSubmitting || isSuccess}
                    isSubmitting={isSubmitting}
                    isSuccess={isSuccess}
                    text="Secure Sign In"
                  />
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                </div>
              </form>

              {/* Patient Register link */}
              <div className="mt-4 border-t border-slate-100 pt-4 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  New Patient?{" "}
                  <Link to="/register" className="font-bold text-blue-600 hover:text-blue-800 hover:underline">
                    Register for Patient Portal & Appointments →
                  </Link>
                </p>
              </div>
            </motion.div>

            {/* Back button */}
            <div className="text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Marketing Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
  );
}
