import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  MapPin,
  ShieldAlert,
  FileText,
  UserPlus,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { registrationSchema, RegistrationFormData } from "../../features/authValidation";

export function RegisterPage() {
  const { data: hospital } = usePublicHospital();
  const hospitalName = hospital?.name || "HMS Enterprise";
  const logoUrl = hospital?.logoUrl;
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const registerMutation = useRegisterPatientUser();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchingPhone, setSearchingPhone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getFieldState,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
    defaultValues: {
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
    },
  });

  useEffect(() => {
    document.title = `${hospitalName} | Patient Registration`;
  }, [hospitalName]);

  const watchedPhone = watch("phone");

  // Real-time lookup if existing patient profile exists for this phone number
  useEffect(() => {
    const cleanPhone = (watchedPhone || "").replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      const checkPhone = async () => {
        setSearchingPhone(true);
        setServerError(null);
        try {
          const res = await api.get(`/auth/check-phone?phone=${cleanPhone}`);
          if (res.data.exists) {
            if (res.data.hasPassword) {
              toast.error("This phone number is already registered. Please log in.");
              setServerError("This phone number is already registered. Please log in.");
            } else {
              toast.success("Existing patient profile found! Pre-populating details.");
              const p = res.data.patient;
              if (p.name) setValue("name", p.name, { shouldValidate: true });
              if (p.email) setValue("email", p.email, { shouldValidate: true });
              if (p.age !== null && p.age !== undefined) setValue("age", p.age, { shouldValidate: true });
              if (p.gender) setValue("gender", p.gender, { shouldValidate: true });
              if (p.bloodGroup) setValue("bloodGroup", p.bloodGroup, { shouldValidate: true });
              if (p.address) setValue("address", p.address, { shouldValidate: true });
              if (p.allergies) setValue("allergies", p.allergies);
              if (p.insuranceProvider) setValue("insuranceProvider", p.insuranceProvider);
              if (p.insurancePolicyNumber) setValue("insurancePolicyNumber", p.insurancePolicyNumber);
              if (p.emergencyName) setValue("emergencyName", p.emergencyName, { shouldValidate: true });
              if (p.emergencyPhone) setValue("emergencyPhone", p.emergencyPhone, { shouldValidate: true });
              if (p.emergencyRelation) setValue("emergencyRelation", p.emergencyRelation, { shouldValidate: true });
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
  }, [watchedPhone, setValue]);

  const onValidSubmit = async (data: RegistrationFormData) => {
    setServerError(null);
    setValidationError(null);

    // Prevent duplicate submissions
    if (isSubmitting || registerMutation.isPending) return;

    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        phone: data.phone.trim(),
        age: Number(data.age),
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        address: data.address.trim(),
        allergies: (data.allergies || "").trim(),
        insuranceProvider: (data.insuranceProvider || "").trim(),
        insurancePolicyNumber: (data.insurancePolicyNumber || "").trim(),
        emergencyContact: {
          name: data.emergencyName.trim(),
          phone: data.emergencyPhone.trim(),
          relation: data.emergencyRelation.trim(),
        },
      };

      const result = await registerMutation.mutateAsync(payload);

      if (result && result.token) {
        toast.success("Registration successful! Welcome to " + hospitalName);
        tokenStorage.set(result.token, result.refreshToken);
        tokenStorage.broadcastSessionEvent("LOGIN", result.user?.id);
        await refreshUser();
        navigate("/patient", { replace: true });
      } else {
        toast.success("Registration completed. Please log in.");
        navigate("/login", { replace: true });
      }
    } catch (err: any) {
      // Failed authentication: DO NOT store tokens, DO NOT navigate to home page!
      const msg = err.response?.data?.message || err.message || "Registration failed. Please try again.";
      setServerError(msg);
      toast.error(msg);
    }
  };

  const onInvalidSubmit = (fieldErrors: any) => {
    const errorKeys = Object.keys(fieldErrors) as (keyof RegistrationFormData)[];
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const firstError = fieldErrors[firstKey];
      const errorMsg = firstError?.message || "Please enter valid data in all required fields.";

      setValidationError(errorMsg);

      // Display popup message on the screen indicating the validation error
      toast.error(errorMsg, {
        id: "register-form-validation-error",
        duration: 4000,
      });

      const fieldElem = document.querySelector(`[name="${firstKey}"]`) as HTMLElement;
      if (fieldElem) {
        fieldElem.focus();
        fieldElem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleFieldBlur = (fieldName: keyof RegistrationFormData) => {
    setTimeout(async () => {
      if (fieldName === "password" || fieldName === "confirmPassword") {
        await trigger(["password", "confirmPassword"]);
      } else {
        await trigger(fieldName);
      }
      const fieldState = getFieldState(fieldName);
      const val = getValues(fieldName);
      if (fieldState.error && fieldState.error.message && val !== undefined && String(val).trim().length > 0) {
        toast.error(fieldState.error.message, {
          id: `err-${fieldName}`,
          duration: 3500,
        });
      }
    }, 50);
  };

  const isPending = isSubmitting || registerMutation.isPending;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-50 font-sans">
      {/* --- LEFT PANEL: Branding & Info (Hidden on mobile) --- */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-8 lg:w-[360px] xl:w-[420px] shrink-0 h-full overflow-hidden text-white">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 bottom-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        {/* Logo */}
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

        {/* Info */}
        <div className="my-auto space-y-6 relative z-10 py-6">
          <div className="space-y-3">
            <span className="inline-block rounded-full bg-indigo-500/10 border border-indigo-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              Direct Clinical Network
            </span>
            <h2 className="text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight text-white">
              Instant Patient Registration
            </h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Create your verified patient profile to schedule OPD appointments, track medical histories, view diagnostic laboratory test reports, and connect with clinical specialists.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-xs">
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
      <div className="flex-1 h-full overflow-y-auto px-4 py-8 sm:px-10 lg:px-12 bg-slate-50">
        <div className="mx-auto w-full max-w-3xl space-y-6 pb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-650 shrink-0" />
                Patient Self-Registration
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Fill in your details below to create your patient account.
              </p>
            </div>
            <Link
              to="/login"
              className="text-xs font-bold text-indigo-650 hover:text-indigo-800 hover:underline flex items-center gap-1 shrink-0"
            >
              Already registered? Sign In →
            </Link>
          </div>

          {validationError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-start justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <p className="font-bold">Validation Error</p>
                  <p className="mt-0.5">{validationError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-rose-400 hover:text-rose-700 text-xs font-bold p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          )}
          {serverError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{serverError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)} noValidate className="space-y-6">
            {/* SECTION 1: Personal & Account Security */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="h-4 w-4 text-indigo-650" />
                1. Account & Security Details
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Full Name *</label>
                    <span className="text-[10px] text-slate-400">2-50 chars</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={50}
                      {...register("name", { onBlur: () => handleFieldBlur("name") })}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs font-medium outline-none transition-colors ${
                        errors.name
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      }`}
                    />
                    <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.name.message}</span>
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Email Address *</label>
                    <span className="text-[10px] text-slate-400">max 254 chars</span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      maxLength={254}
                      {...register("email", { onBlur: () => handleFieldBlur("email") })}
                      placeholder="rahul@example.com"
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs font-medium outline-none transition-colors ${
                        errors.email
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      }`}
                    />
                    <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.email.message}</span>
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Password * (8-64 chars)</label>
                    <span className="text-[10px] text-slate-400">Letter & number</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      maxLength={64}
                      {...register("password", { onBlur: () => handleFieldBlur("password") })}
                      placeholder="••••••••"
                      className={`w-full rounded-lg border pl-9 pr-9 py-2 text-xs font-medium outline-none transition-colors ${
                        errors.password
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      }`}
                    />
                    <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.password.message}</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Confirm Password *</label>
                    <span className="text-[10px] text-slate-400">Must match</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      maxLength={64}
                      {...register("confirmPassword", { onBlur: () => handleFieldBlur("confirmPassword") })}
                      placeholder="••••••••"
                      className={`w-full rounded-lg border pl-9 pr-9 py-2 text-xs font-medium outline-none transition-colors ${
                        errors.confirmPassword
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      }`}
                    />
                    <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.confirmPassword.message}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: Demographics & Address */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                2. Patient Demographics & Contact
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Phone Number *</label>
                    <span className="text-[10px] text-slate-400">10-15 digits</span>
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={20}
                      {...register("phone", { onBlur: () => handleFieldBlur("phone") })}
                      placeholder="+91 98765 43210"
                      className={`w-full rounded-lg border pl-9 pr-9 py-2 text-xs font-medium outline-none transition-colors ${
                        errors.phone
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      }`}
                    />
                    <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    {searchingPhone && (
                      <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-indigo-600" />
                    )}
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.phone.message}</span>
                    </p>
                  )}
                </div>

                {/* Age */}
                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-700">Age * (0-150)</label>
                  <input
                    type="number"
                    min="0"
                    max="150"
                    {...register("age", { onBlur: () => handleFieldBlur("age") })}
                    placeholder="e.g. 28"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors ${
                      errors.age
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    }`}
                  />
                  {errors.age && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.age.message}</span>
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-700">Gender *</label>
                  <select
                    {...register("gender")}
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors bg-white ${
                      errors.gender
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.gender.message}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Blood Group */}
                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-700">Blood Group *</label>
                  <select
                    {...register("bloodGroup")}
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors bg-white ${
                      errors.bloodGroup
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    }`}
                  >
                    {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                  {errors.bloodGroup && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.bloodGroup.message}</span>
                    </p>
                  )}
                </div>

                {/* Residential Address */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Residential Address *</label>
                    <span className="text-[10px] text-slate-400">5-250 chars</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={250}
                      {...register("address", { onBlur: () => handleFieldBlur("address") })}
                      placeholder="House / Street, City, Pincode"
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs font-medium outline-none transition-colors ${
                        errors.address
                          ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      }`}
                    />
                    <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                  {errors.address && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.address.message}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: Emergency Contact */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2 border-b border-slate-100 pb-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                3. Emergency Contact Person
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Emergency Contact Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Contact Name *</label>
                    <span className="text-[10px] text-slate-400">2-50 chars</span>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    {...register("emergencyName", { onBlur: () => handleFieldBlur("emergencyName") })}
                    placeholder="Kin / Guardian Name"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors ${
                      errors.emergencyName
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    }`}
                  />
                  {errors.emergencyName && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.emergencyName.message}</span>
                    </p>
                  )}
                </div>

                {/* Emergency Contact Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Contact Phone *</label>
                    <span className="text-[10px] text-slate-400">10-15 digits</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={20}
                    {...register("emergencyPhone", { onBlur: () => handleFieldBlur("emergencyPhone") })}
                    placeholder="Emergency Mobile No."
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors ${
                      errors.emergencyPhone
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    }`}
                  />
                  {errors.emergencyPhone && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.emergencyPhone.message}</span>
                    </p>
                  )}
                </div>

                {/* Emergency Contact Relationship */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Relationship *</label>
                    <span className="text-[10px] text-slate-400">max 50 chars</span>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    {...register("emergencyRelation", { onBlur: () => handleFieldBlur("emergencyRelation") })}
                    placeholder="e.g. Spouse / Father / Sister"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors ${
                      errors.emergencyRelation
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    }`}
                  />
                  {errors.emergencyRelation && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1" role="alert">
                      <span>{errors.emergencyRelation.message}</span>
                    </p>
                  )}
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
                    maxLength={500}
                    {...register("allergies", { onBlur: () => handleFieldBlur("allergies") })}
                    placeholder="e.g. Penicillin, Asthma, Diabetes"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors ${
                      errors.allergies
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    }`}
                  />
                  {errors.allergies && (
                    <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">
                      {errors.allergies.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-700">Insurance Provider</label>
                  <input
                    type="text"
                    maxLength={100}
                    {...register("insuranceProvider", { onBlur: () => handleFieldBlur("insuranceProvider") })}
                    placeholder="e.g. Star Health / Max Bupa"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors ${
                      errors.insuranceProvider
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    }`}
                  />
                  {errors.insuranceProvider && (
                    <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">
                      {errors.insuranceProvider.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 text-xs font-bold text-slate-700">Insurance Policy / Card Number</label>
                  <input
                    type="text"
                    maxLength={50}
                    {...register("insurancePolicyNumber", { onBlur: () => handleFieldBlur("insurancePolicyNumber") })}
                    placeholder="e.g. POL-987654321"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors ${
                      errors.insurancePolicyNumber
                        ? "border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    }`}
                  />
                  {errors.insurancePolicyNumber && (
                    <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">
                      {errors.insurancePolicyNumber.message}
                    </p>
                  )}
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
                disabled={isPending}
                className="bg-indigo-650 hover:bg-indigo-700 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50"
              >
                {isPending ? "Registering Patient..." : "Complete Registration"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
