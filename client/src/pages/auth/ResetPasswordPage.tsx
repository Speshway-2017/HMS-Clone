import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { usePublicHospital } from "../../features/hospitals";
import { api } from "../../lib/api";
import { MAX_LENGTHS } from "../../lib/validation";
import { ShieldCheck, Activity, ArrowLeft, CheckCircle2, Eye, EyeOff, XCircle, CheckCircle } from "lucide-react";

export function ResetPasswordPage() {
  const { user } = useAuth();
  const { token } = useParams();
  const navigate = useNavigate();
  const { data: hospital } = usePublicHospital();
  const hospitalName = hospital?.name || "HMS Enterprise";
  const logoUrl = hospital?.logoUrl;

  useEffect(() => {
    document.title = `${hospitalName} | Reset Password`;
  }, [hospitalName]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password criteria checks
  const isMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // Validate client-side password criteria
    if (password.length > MAX_LENGTHS.PASSWORD) {
      setError(`Password cannot exceed ${MAX_LENGTHS.PASSWORD} characters.`);
      return;
    }
    if (!isMinLength || !hasLetter || !hasNumber) {
      setError("Please ensure your new password meets all security criteria.");
      return;
    }

    if (password !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to reset password."
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
                Credential Security Manager
              </span>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
                Update Security Credentials.
              </h2>
              <p className="text-sm leading-relaxed text-slate-300">
                HMS Enterprise enforces enterprise-grade security regulations. Please define a strong password containing both alphabetic letters and numerical digits.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Automated Session Invalidation
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Cryptographic Bcrypt Salting
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
              <Link to="/" className="inline-flex lg:hidden items-center gap-2.5 text-xl font-extrabold text-emerald-900 justify-center">
                {logoUrl && (
                  <img src={logoUrl} alt={hospitalName} className="h-8 w-8 rounded-lg object-cover" />
                )}
                <span>{hospitalName}</span>
              </Link>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Reset Password
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Enter your new security credentials below to update your login profile.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl">
              {success ? (
                <div className="space-y-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-900">Password Reset Successful</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      Your password has been successfully reset. All prior active sessions have been securely logged out.
                    </p>
                    <p className="text-[10px] text-emerald-500 animate-pulse font-bold mt-1">
                      Redirecting to login dashboard...
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-bold hover:underline"
                    >
                      Sign In Now <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold text-slate-700">
                  {/* New Password */}
                  <div>
                    <label htmlFor="email" className="block mb-1 text-xs text-slate-600">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 pl-3.5 pr-10 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium transition-all text-sm"
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

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block mb-1 text-xs text-slate-600">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 pl-3.5 pr-10 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium transition-all text-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Strength validation checklist */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-[10px] text-slate-500 font-bold">
                    <span className="uppercase text-[9px] text-slate-400 tracking-wider block mb-1">PASSWORD STRENGTH</span>
                    <div className="flex items-center gap-1.5">
                      {isMinLength ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                      <span>At least 8 characters long</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasLetter ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                      <span>Contains at least one letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasNumber ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                      <span>Contains at least one number</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordsMatch ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                      <span>Passwords match correctly</span>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-650 font-bold leading-normal">
                      {error}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full font-bold py-2.5" 
                    disabled={isSubmitting || !isMinLength || !hasLetter || !hasNumber || !passwordsMatch}
                  >
                    {isSubmitting ? "Resetting Password..." : "Update Password"}
                  </Button>

                  <div className="text-center pt-2 border-t border-slate-100">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 font-bold hover:underline transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" /> Cancel and Sign In
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
