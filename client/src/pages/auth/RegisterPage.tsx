import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegisterPatientUser } from "../../features/auth";
import { usePublicHospital } from "../../features/hospitals";
import { useAuth } from "../../context/AuthContext";
import { tokenStorage } from "../../lib/tokenStorage";
import { Button } from "../../components/ui/Button";
import {
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  Heart,
  ShieldCheck,
  ArrowLeft,
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  MapPin,
  ShieldAlert,
  FileText,
  UserPlus,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";

export function RegisterPage() {
  const { data: hospital } = usePublicHospital();
  const hospitalName = hospital?.name || "HMS Enterprise";
  const logoUrl = hospital?.logoUrl;
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const registerMutation = useRegisterPatientUser();

  useEffect(() => {
    document.title = `${hospitalName} | Patient Registration`;
  }, [hospitalName]);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    age: "",
    gender: "Male",
    bloodGroup: "O+",
    address: "",
    allergies: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchingPhone, setSearchingPhone] = useState(false);

  useEffect(() => {
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      const checkPhone = async () => {
        setSearchingPhone(true);
        setError(null);
        try {
          const res = await api.get(`/auth/check-phone?phone=${cleanPhone}`);
          if (res.data.exists) {
            if (res.data.hasPassword) {
              toast.error("This phone number is already registered. Please log in.");
              setError("This phone number is already registered. Please log in.");
            } else {
              toast.success("Existing patient profile found! Pre-populating details.");
              const p = res.data.patient;
              setFormData((prev) => ({
                ...prev,
                name: p.name || prev.name,
                email: p.email || prev.email,
                age: p.age !== null && p.age !== undefined ? String(p.age) : prev.age,
                gender: p.gender || prev.gender,
                bloodGroup: p.bloodGroup || prev.bloodGroup,
                address: p.address || prev.address,
                allergies: p.allergies || prev.allergies,
                insuranceProvider: p.insuranceProvider || prev.insuranceProvider,
                insurancePolicyNumber: p.insurancePolicyNumber || prev.insurancePolicyNumber,
                emergencyName: p.emergencyName || prev.emergencyName,
                emergencyPhone: p.emergencyPhone || prev.emergencyPhone,
                emergencyRelation: p.emergencyRelation || prev.emergencyRelation,
              }));
            }
          }
        } catch (err: any) {
          console.error("Failed to check phone registration status", err);
        } finally {
          setSearchingPhone(false);
        }
      };
      checkPhone();
    }
  }, [formData.phone]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validations - Section 1 (Mandatory)
    if (!formData.name.trim()) {
      setError("Full Name is required (Section 1).");
      return;
    }
    if (!formData.email.trim()) {
      setError("Email address is required (Section 1).");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long (Section 1).");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match (Section 1).");
      return;
    }

    // Form Validations - Section 2 (Mandatory)
    if (!formData.phone.trim()) {
      setError("Phone Number is required (Section 2).");
      return;
    }
    if (!formData.age || isNaN(parseInt(formData.age, 10)) || parseInt(formData.age, 10) < 0) {
      setError("Valid Age is required (Section 2).");
      return;
    }
    if (!formData.gender.trim()) {
      setError("Gender selection is required (Section 2).");
      return;
    }
    if (!formData.bloodGroup.trim()) {
      setError("Blood Group selection is required (Section 2).");
      return;
    }
    if (!formData.address.trim()) {
      setError("Residential Address is required (Section 2).");
      return;
    }

    // Form Validations - Section 3 (Mandatory)
    if (!formData.emergencyName.trim()) {
      setError("Emergency Contact Name is required (Section 3).");
      return;
    }
    if (!formData.emergencyPhone.trim()) {
      setError("Emergency Contact Phone Number is required (Section 3).");
      return;
    }
    if (!formData.emergencyRelation.trim()) {
      setError("Emergency Contact Relationship is required (Section 3).");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        address: formData.address.trim(),
        allergies: formData.allergies.trim(),
        insuranceProvider: formData.insuranceProvider.trim(),
        insurancePolicyNumber: formData.insurancePolicyNumber.trim(),
        emergencyContact: {
          name: formData.emergencyName.trim(),
          phone: formData.emergencyPhone.trim(),
          relation: formData.emergencyRelation.trim(),
        },
      };

      const result = await registerMutation.mutateAsync(payload);

      toast.success("Registration successful! Welcome to " + hospitalName);

      if (result.token) {
        tokenStorage.set(result.token, result.refreshToken);
        tokenStorage.broadcastSessionEvent("LOGIN", result.user?.id);
        await refreshUser();
        navigate("/patient", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Registration failed. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <div className="flex w-full grid-cols-12 lg:grid">
        {/* --- LEFT PANEL: Branding & Info (Hidden on mobile) --- */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-12 text-white lg:col-span-5 lg:flex xl:col-span-4 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 text-lg font-extrabold tracking-tight relative z-10">
            {logoUrl ? (
              <img src={logoUrl} alt={hospitalName} className="h-8 w-8 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm shadow-md">
                <Activity className="h-4 w-4" />
              </div>
            )}
            <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              {hospitalName}
            </span>
          </Link>

          {/* Info */}
          <div className="my-auto space-y-8 relative z-10">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <UserPlus className="h-3 w-3 text-emerald-400" /> Fast-Track Patient Registration
              </span>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
                Join Our Digital Healthcare Network
              </h2>
              <p className="text-xs leading-relaxed text-slate-300">
                Create your verified patient profile to schedule OPD appointments, track medical histories, view diagnostic laboratory test reports, and connect with clinical specialists.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Instant UHID Generation</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">Automated unique health identification code linked directly to our reception desk matrix.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Real-Time Reception Sync</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">Your registration is fetched in real-time by receptionists for instant check-in & OPD token issuance.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Encrypted & HIPAA Compliant</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">Your personal information and medical records are isolated and protected using AES-256 encryption.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 relative z-10">
            © {new Date().getFullYear()} {hospitalName}. Managed Healthcare Platform.
          </div>
        </div>

        {/* --- RIGHT PANEL: Patient Registration Form --- */}
        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:col-span-7 xl:col-span-8 bg-slate-50 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <UserPlus className="h-6 w-6 text-indigo-650" />
                  Patient Self-Registration
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Sections 1, 2, and 3 fields are mandatory. Section 4 is optional.
                </p>
              </div>
              <Link
                to="/login"
                className="text-xs font-bold text-indigo-650 hover:text-indigo-800 hover:underline flex items-center gap-1"
              >
                Already registered? Sign In →
              </Link>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: Personal & Account Security */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User className="h-4 w-4 text-indigo-650" />
                  1. Account & Security Details <span className="text-rose-600 font-bold">(Mandatory)</span>
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Full Name *</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                      <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Email Address *</label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="rahul@example.com"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                      <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Password * (min 6 chars)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                      <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                      <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Demographics & Address */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  2. Patient Demographics & Contact <span className="text-rose-600 font-bold">(Mandatory)</span>
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Phone Number *</label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                      <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      {searchingPhone && (
                        <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-indigo-600" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Age *</label>
                    <input
                      type="number"
                      name="age"
                      required
                      min="0"
                      max="120"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="e.g. 28"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Gender *</label>
                    <select
                      name="gender"
                      required
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Blood Group *</label>
                    <select
                      name="bloodGroup"
                      required
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
                    >
                      {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-xs font-bold text-slate-700">Residential Address *</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="address"
                        required
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="House / Street, City, Pincode"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                      <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Emergency Contact */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  3. Emergency Contact Person <span className="text-rose-600 font-bold">(Mandatory)</span>
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Contact Name *</label>
                    <input
                      type="text"
                      name="emergencyName"
                      required
                      value={formData.emergencyName}
                      onChange={handleChange}
                      placeholder="Kin / Guardian Name"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Contact Phone *</label>
                    <input
                      type="tel"
                      name="emergencyPhone"
                      required
                      value={formData.emergencyPhone}
                      onChange={handleChange}
                      placeholder="Emergency Mobile No."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Relationship *</label>
                    <input
                      type="text"
                      name="emergencyRelation"
                      required
                      value={formData.emergencyRelation}
                      onChange={handleChange}
                      placeholder="e.g. Spouse / Father / Sister"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Medical History & Insurance */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <FileText className="h-4 w-4 text-teal-600" />
                  4. Allergies & Insurance Details (Optional)
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Known Allergies / Medical Conditions</label>
                    <input
                      type="text"
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      placeholder="e.g. Penicillin, Asthma, Diabetes"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Insurance Provider</label>
                    <input
                      type="text"
                      name="insuranceProvider"
                      value={formData.insuranceProvider}
                      onChange={handleChange}
                      placeholder="e.g. Star Health / Max Bupa"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-xs font-bold text-slate-700">Insurance Policy / Card Number</label>
                    <input
                      type="text"
                      name="insurancePolicyNumber"
                      value={formData.insurancePolicyNumber}
                      onChange={handleChange}
                      placeholder="e.g. POL-987654321"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Form Submission Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Cancel & Back to Login
                </Link>

                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="bg-indigo-650 hover:bg-indigo-700 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all"
                >
                  {registerMutation.isPending ? "Registering Patient..." : "Complete Registration"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
