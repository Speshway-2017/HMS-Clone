import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { ROLE_HOME_PATH } from "../../types/auth";
import { usePublicHospital } from "../../features/hospitals";

export function LoginPage() {
  const { user, login } = useAuth();
  const { data: hospital } = usePublicHospital();
  const hospitalName = hospital?.name || "HMS Enterprise";
  const logoUrl = hospital?.logoUrl;

  useEffect(() => {
    document.title = hospitalName;
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold text-navy-700 flex items-center justify-center gap-2">
            {hospital?.logoUrl && (
              <img src={hospital.logoUrl} alt={hospitalName} className="h-8 w-8 rounded object-cover" />
            )}
            <span>{hospitalName}</span>
          </Link>
          <p className="mt-1 text-sm text-slate-500">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-8 shadow-card">
          <div className="mb-4">
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              placeholder="you@hospital.com"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
