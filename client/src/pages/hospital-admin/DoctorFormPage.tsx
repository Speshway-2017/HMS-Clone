import { FormEvent, useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { 
  UserPlus, 
  GraduationCap, 
  ShieldCheck, 
  Copy, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Stethoscope, 
  Building2, 
  Clock, 
  CheckCircle2,
  Calendar,
  DollarSign
} from "lucide-react";
import toast from "react-hot-toast";
import { useDoctor, useCreateDoctor, useUpdateDoctor } from "../../features/doctors";
import { useDepartments } from "../../features/departments";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { isValidEmail, isValidPhone } from "../../lib/validation";
import { useBranchContext } from "../../context/BranchContext";

const DOCTOR_LIMITS = {
  NAME: 100,
  EMAIL: 100,
  PHONE: 10,
  SPECIALIZATION: 100,
  QUALIFICATION: 100,
  LICENSE_NO: 50,
  CONSULTATION_FEE: 20,
  BIO: 500,
} as const;

// Patterns
const NAME_REGEX = /^[a-zA-Z\s\.\-']+$/;
const SPECIALIZATION_REGEX = /^[a-zA-Z\s\.\-/'&,()]+$/;
const QUALIFICATION_REGEX = /^[a-zA-Z0-9\s\.\-/'&,()]+$/;
const LICENSE_REGEX = /^[A-Za-z0-9\-_]+$/;

export function DoctorFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data } = useDoctor(id);
  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor(id ?? "");
  const { isAllBranches, branches } = useBranchContext();
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const { data: departments, isLoading: isDepartmentsLoading } = useDepartments();
  const activeDepartments = departments?.filter((d) => !d.isDisabled) ?? [];

  const [form, setForm] = useState({
    name: "",
    gender: "Male",
    email: "",
    phone: "",
    photoUrl: "",
    bio: "",
    department: "",
    specialization: "",
    qualification: "",
    licenseNo: "",
    dateOfJoining: new Date().toISOString().split("T")[0],
    consultationFee: "500",
    status: "on_duty" as "on_duty" | "on_leave" | "off_duty",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  // Fetch or regenerate composite Unique Doctor ID
  const fetchNextId = useCallback((nameVal?: string) => {
    if (isEdit) return;
    setIsGeneratingId(true);
    api.get("/staff/next-employee-id", { 
      params: { 
        role: "doctor", 
        name: nameVal || form.name || undefined 
      } 
    })
      .then((res) => {
        const nextId = res.data.data?.employeeId;
        if (nextId) {
          setForm((prev) => ({ ...prev, licenseNo: nextId }));
          setFieldErrors((prev) => ({ ...prev, licenseNo: undefined }));
        }
      })
      .catch(() => {})
      .finally(() => setIsGeneratingId(false));
  }, [isEdit, form.name]);

  useEffect(() => {
    if (!isEdit) {
      fetchNextId();
    }
  }, [isEdit]);

  // When name changes, debounce ID re-generation to incorporate doctor initials
  useEffect(() => {
    if (isEdit || !form.name.trim()) return;
    const timer = setTimeout(() => {
      if (form.name.trim().length >= 2) {
        fetchNextId(form.name);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.name, isEdit]);

  useEffect(() => {
    if (data?.doctor) {
      const doctor = data.doctor;
      const deptId =
        typeof doctor.department === "object" && doctor.department !== null
          ? (doctor.department as any)._id
          : doctor.department || "";
      setForm({
        name: doctor.name || "",
        gender: (doctor as any).gender || "Male",
        email: doctor.email || "",
        phone: doctor.phone || "",
        photoUrl: doctor.photoUrl || "",
        bio: doctor.bio || "",
        department: deptId,
        specialization: doctor.specialization || "",
        qualification: doctor.qualification || "",
        licenseNo: doctor.licenseNo || "",
        dateOfJoining: doctor.dateOfJoining
          ? new Date(doctor.dateOfJoining).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        consultationFee: doctor.consultationFee?.replace(/[^\d]/g, "") || "500",
        status: doctor.status || "on_duty",
      });
      setFieldErrors({});
    }
  }, [data]);

  // Synchronize department selection if specialization exists but department ID is not set
  useEffect(() => {
    if (departments && departments.length > 0 && !form.department && form.specialization) {
      const match = departments.find(
        (d) => d.name.toLowerCase() === form.specialization.trim().toLowerCase()
      );
      if (match) {
        setForm((prev) => ({ ...prev, department: match._id }));
      }
    }
  }, [departments, form.department, form.specialization]);

  const validateField = (
    field:
      | "name"
      | "gender"
      | "email"
      | "phone"
      | "specialization"
      | "qualification"
      | "licenseNo"
      | "consultationFee"
      | "bio"
      | "photoUrl",
    value: any
  ): string | undefined => {
    const valStr = typeof value === "string" ? value : String(value ?? "");
    const trimmed = valStr.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Full Name is required. Please fill out this field";
      }
      if (valStr.length > DOCTOR_LIMITS.NAME) {
        return `Full Name cannot exceed ${DOCTOR_LIMITS.NAME} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !NAME_REGEX.test(trimmed)) {
        return "Full Name should contain only letters, dots, hyphens, and spaces. Please enter valid data";
      }
      return undefined;
    }

    if (field === "gender") {
      if (!trimmed) {
        return "Please select a gender. Please fill out this field";
      }
      return undefined;
    }

    if (field === "email") {
      if (!isEdit && !trimmed) {
        return "Email Address is required. Please fill out this field";
      }
      if (valStr.length > DOCTOR_LIMITS.EMAIL) {
        return `Email Address cannot exceed ${DOCTOR_LIMITS.EMAIL} characters. Please enter valid data`;
      }
      if (trimmed && !isValidEmail(trimmed)) {
        return "Please enter a valid email address. Please enter valid data";
      }
      return undefined;
    }

    if (field === "phone") {
      if (!trimmed) {
        if (valStr.length > 0) return "Please enter valid data";
        return undefined;
      }
      const digitsOnly = valStr.replace(/\D/g, "");
      if (/[^\d]/.test(valStr)) {
        return "Invalid phone number. Phone Number should accept 10 digits only. Please enter valid data";
      }
      if (digitsOnly.length > DOCTOR_LIMITS.PHONE) {
        return `Phone Number cannot exceed ${DOCTOR_LIMITS.PHONE} digits. Please enter valid data`;
      }
      if (digitsOnly.length < 10) {
        return "Invalid phone number. Phone Number should accept 10 digits only. Please enter valid data";
      }
      if (!isValidPhone(valStr)) {
        return "Please enter a valid 10-digit phone number. Please enter valid data";
      }
      return undefined;
    }

    if (field === "specialization") {
      if (!trimmed && !form.department) {
        return "Clinical Department is required. Please select a department";
      }
      return undefined;
    }

    if (field === "qualification") {
      if (!trimmed) {
        if (valStr.length > 0) return "Please enter valid data";
        return undefined;
      }
      if (valStr.length > DOCTOR_LIMITS.QUALIFICATION) {
        return `Qualification cannot exceed ${DOCTOR_LIMITS.QUALIFICATION} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !QUALIFICATION_REGEX.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
        return "Qualification contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "licenseNo") {
      if (!trimmed) {
        return "Doctor / License ID is required. Please fill out this field";
      }
      if (valStr.length > DOCTOR_LIMITS.LICENSE_NO) {
        return `Doctor / License ID cannot exceed ${DOCTOR_LIMITS.LICENSE_NO} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !LICENSE_REGEX.test(trimmed)) {
        return "Doctor / License ID must contain only letters, numbers, hyphens, and underscores. Please enter valid data";
      }
      return undefined;
    }

    if (field === "bio") {
      if (valStr.length > DOCTOR_LIMITS.BIO) {
        return `Bio cannot exceed ${DOCTOR_LIMITS.BIO} characters. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "photoUrl") {
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      const isImage =
        lower.startsWith("data:image/") ||
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".svg");
      if (!isImage) {
        return "The uploaded file is invalid or unsupported, and only image files are accepted.";
      }
      return undefined;
    }

    if (field === "consultationFee") {
      if (!trimmed) return undefined;
      const cleanVal = valStr.replace(/[^\d]/g, "");
      if (!cleanVal || isNaN(Number(cleanVal)) || Number(cleanVal) < 0) {
        return "Please enter a valid consultation fee amount";
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: string,
    currentLen: number,
    limit: number,
    label: string,
    isPhone = false
  ) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    if (isPhone && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    if (currentLen >= limit) {
      e.preventDefault();
      setFieldErrors((prev) => ({
        ...prev,
        [field]: `${label} cannot exceed ${limit} characters. Please enter valid data`,
      }));
      setError("Please enter valid data");
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field as any, (form as any)[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) setError("Please enter valid data");
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string | undefined> = {
      name: validateField("name", form.name),
      gender: validateField("gender", form.gender),
      email: validateField("email", form.email),
      phone: validateField("phone", form.phone),
      specialization: !form.department && !form.specialization.trim() ? "Clinical Department is required. Please select a department" : undefined,
      qualification: validateField("qualification", form.qualification),
      licenseNo: validateField("licenseNo", form.licenseNo),
      consultationFee: validateField("consultationFee", form.consultationFee),
      bio: validateField("bio", form.bio),
      photoUrl: validateField("photoUrl", form.photoUrl),
    };

    setFieldErrors(errors);
    setTouched({
      name: true,
      gender: true,
      email: true,
      phone: true,
      specialization: true,
      qualification: true,
      licenseNo: true,
      consultationFee: true,
      bio: true,
      photoUrl: true,
    });

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      const firstError = Object.values(errors).find(Boolean);
      setError("Please enter valid data");
      toast.error(firstError || "Please enter valid data", { id: "doctor-form-invalid" });
      return;
    }

    const payload: any = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department: form.department || null,
      specialization: form.specialization.trim(),
      qualification: form.qualification.trim(),
      licenseNo: form.licenseNo.trim(),
      bio: form.bio.trim(),
      consultationFee: form.consultationFee ? `₹${form.consultationFee.replace(/[^\d]/g, "")}` : "₹500",
      dateOfJoining: form.dateOfJoining || undefined,
      status: "on_duty",
      rating: 0,
      opExpiryLimit: 10,
    };

    if (!isEdit && isAllBranches && selectedBranchId) {
      payload.branch = selectedBranchId;
    }

    try {
      if (isEdit) {
        await updateDoctor.mutateAsync(payload);
        toast.success("Doctor updated successfully!");
        navigate("/admin/doctors");
      } else {
        const result = await createDoctor.mutateAsync(payload);
        toast.success("Doctor onboarded successfully!");
        if (result.tempPassword) {
          setCreated({ email: form.email, tempPassword: result.tempPassword });
        } else {
          navigate("/admin/doctors");
        }
      }
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message || err?.message || "Could not save doctor. Check the form and try again.";
      setError("Please enter valid data");
      toast.error(serverMsg, { id: "doctor-submit-error" });
    }
  }

  const isSaving = createDoctor.isPending || updateDoctor.isPending;

  // Credential reveal modal
  if (created) {
    return (
      <div className="mx-auto max-w-lg pt-8">
        <Card className="p-6 border border-emerald-200 bg-white shadow-md">
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-700">
              <ShieldCheck className="h-8 w-8" />
            </span>
          </div>
          <h2 className="text-center text-xl font-bold text-slate-900">Doctor Profile & Login Created</h2>
          <p className="mt-1.5 text-center text-xs text-slate-500">
            Login credentials have been securely generated and emailed to <strong>{created.email}</strong>. Share these temporary login credentials with the attending consultant if needed. Password is shown only once.
          </p>
          <div className="mt-5 space-y-3 rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold">Doctor Identifier (Unique ID)</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {form.licenseNo}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold">Specialization</span>
              <span className="font-bold text-slate-800">{form.specialization || "Clinical Specialist"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold">Login Username / Email</span>
              <span className="font-bold text-slate-800">{created.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Temporary Password</span>
              <span className="flex items-center gap-2 font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                {created.tempPassword}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(created.tempPassword);
                    toast.success("Password copied to clipboard!");
                  }}
                  className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                  title="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </span>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
            ⚠️ The consultant must update their password upon first login from their Doctor Portal profile settings.
          </p>
          <Button
            variant="primary"
            className="mt-6 w-full justify-center font-bold"
            onClick={() => navigate("/admin/doctors")}
          >
            Done & Return to Doctor Directory
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Breadcrumb & Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
          <Link to="/admin/doctors" className="hover:text-emerald-700 transition-colors">
            Doctor Directory
          </Link>
          <span>&gt;</span>
          <span className="text-emerald-800">{isEdit ? "Edit Profile" : "Onboard Attending Doctor"}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isEdit ? "Edit Doctor Profile" : "Doctor Onboarding Portal"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? "Update clinical credentials, specialty assignment, and consultation parameters."
                : "Register a clinical specialist with an auto-generated composite Unique ID encoding hospital, role, and personal initials."}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 w-fit">
            <Stethoscope className="h-3.5 w-3.5 text-emerald-700" />
            <span>Clinical Onboarding</span>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Doctor Personal Information (Full Width) */}
        <FormSection icon={UserPlus} title="Doctor Personal Information">
          <InputField
            label="Doctor Full Name"
            required
            maxLength={DOCTOR_LIMITS.NAME}
            showCharCount
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, name: val });
              const err = validateField("name", val);
              setFieldErrors((prev) => ({ ...prev, name: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "name", form.name.length, DOCTOR_LIMITS.NAME, "Full Name")}
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Dr. Preethi Dayal"
            hint="Initials will be encoded into the Unique Doctor ID (e.g. PD01)"
          />

          <SelectField
            label="Gender *"
            required
            value={form.gender}
            error={fieldErrors.gender}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, gender: val });
              const err = validateField("gender", val);
              setFieldErrors((prev) => ({ ...prev, gender: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onBlur={() => handleBlur("gender")}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </SelectField>

          <InputField
            label="Official Email Address"
            type="email"
            required={!isEdit}
            disabled={isEdit}
            maxLength={DOCTOR_LIMITS.EMAIL}
            showCharCount
            value={form.email}
            error={fieldErrors.email}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, email: val });
              const err = validateField("email", val);
              setFieldErrors((prev) => ({ ...prev, email: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "email", form.email.length, DOCTOR_LIMITS.EMAIL, "Email Address")}
            onBlur={() => handleBlur("email")}
            placeholder="e.g. preethi.dayal@preethifertility.com"
            hint="Consultant portal login username"
          />

          <InputField
            label="Mobile Phone Number"
            type="tel"
            maxLength={DOCTOR_LIMITS.PHONE}
            showCharCount
            value={form.phone}
            error={fieldErrors.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, DOCTOR_LIMITS.PHONE);
              setForm({ ...form, phone: val });
              const err = validateField("phone", val);
              setFieldErrors((prev) => ({ ...prev, phone: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "phone", form.phone.length, DOCTOR_LIMITS.PHONE, "Phone Number", true)}
            onBlur={() => handleBlur("phone")}
            placeholder="e.g. 9876543210"
            hint="10-digit primary mobile contact"
          />

          <div className="sm:col-span-2">
            <FileUpload
              label="Doctor Portrait Photo"
              folder="doctor-photos"
              value={form.photoUrl}
              onChange={(url) => {
                setForm({ ...form, photoUrl: url });
                setFieldErrors((prev) => ({ ...prev, photoUrl: undefined }));
              }}
              maxSizeMB={2}
              hint="High-resolution clinical portrait. PNG, JPEG, WEBP up to 2MB"
              error={fieldErrors.photoUrl}
              onError={(err) => setFieldErrors((prev) => ({ ...prev, photoUrl: err || undefined }))}
            />
          </div>

          <div className="sm:col-span-2">
            <TextareaField
              label="Professional Summary / Clinical Statement"
              maxLength={DOCTOR_LIMITS.BIO}
              showCharCount
              value={form.bio}
              error={fieldErrors.bio}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, bio: val });
                const err = validateField("bio", val);
                setFieldErrors((prev) => ({ ...prev, bio: err }));
                if (!err && error === "Please enter valid data") setError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "bio", form.bio.length, DOCTOR_LIMITS.BIO, "Bio / Statement")}
              onBlur={() => handleBlur("bio")}
              placeholder="Attending specialist with expertise in advanced reproductive medicine, IVF protocols, and minimally invasive gynecological surgery..."
              rows={3}
            />
          </div>
        </FormSection>

        {/* Section 2: Clinical Specialty & Practice Details (Full Width) */}
        <FormSection icon={GraduationCap} title="Clinical Specialty & Practice Details">
          <SelectField
            label="Clinical Department (Specialization)"
            required
            value={form.department}
            error={fieldErrors.specialization}
            onChange={(e) => {
              const selectedDeptId = e.target.value;
              const selectedDept = departments?.find((d) => d._id === selectedDeptId);
              setForm({
                ...form,
                department: selectedDeptId,
                specialization: selectedDept ? selectedDept.name : "",
              });
              const err = !selectedDeptId ? "Clinical Department is required. Please select a department" : undefined;
              setFieldErrors((prev) => ({ ...prev, specialization: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onBlur={() => {
              const err = !form.department ? "Clinical Department is required. Please select a department" : undefined;
              setFieldErrors((prev) => ({ ...prev, specialization: err }));
            }}
            hint="Select from clinical departments registered to this hospital"
          >
            <option value="">
              {isDepartmentsLoading ? "Loading hospital departments..." : "Select Clinical Department"}
            </option>
            {activeDepartments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name} {dept.code ? `(${dept.code})` : ""}
              </option>
            ))}
          </SelectField>

          <InputField
            label="Unique Doctor ID / License"
            required
            maxLength={DOCTOR_LIMITS.LICENSE_NO}
            showCharCount
            value={form.licenseNo}
            error={fieldErrors.licenseNo}
            rightElement={
              !isEdit ? (
                <button
                  type="button"
                  onClick={() => fetchNextId(form.name)}
                  disabled={isGeneratingId}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  title="Re-generate unique doctor ID"
                >
                  <RefreshCw className={`h-3 w-3 ${isGeneratingId ? "animate-spin" : ""}`} />
                  <span>Re-generate</span>
                </button>
              ) : undefined
            }
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, licenseNo: val });
              const err = validateField("licenseNo", val);
              setFieldErrors((prev) => ({ ...prev, licenseNo: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "licenseNo", form.licenseNo.length, DOCTOR_LIMITS.LICENSE_NO, "Doctor / License ID")}
            onBlur={() => handleBlur("licenseNo")}
            placeholder="Auto-generating unique ID..."
            hint="Format: <Hospital>-DOC-<Initials><Seq>"
          />

          <InputField
            label="Medical Qualification / Degrees"
            required
            maxLength={DOCTOR_LIMITS.QUALIFICATION}
            showCharCount
            value={form.qualification}
            error={fieldErrors.qualification}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, qualification: val });
              const err = validateField("qualification", val);
              setFieldErrors((prev) => ({ ...prev, qualification: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "qualification", form.qualification.length, DOCTOR_LIMITS.QUALIFICATION, "Qualification")}
            onBlur={() => handleBlur("qualification")}
            placeholder="e.g. MBBS, MS (OBG), FRCOG"
            hint="Medical degrees, fellowships, certifications"
          />

          <InputField
            label="Date of Joining"
            type="date"
            value={form.dateOfJoining}
            onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
            hint="Official hospital clinical commencement date"
          />

          <InputField
            label="Standard Consultation Fee (₹)"
            type="number"
            min={0}
            maxLength={DOCTOR_LIMITS.CONSULTATION_FEE}
            value={form.consultationFee}
            error={fieldErrors.consultationFee}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d]/g, "");
              setForm({ ...form, consultationFee: val });
              const err = validateField("consultationFee", val);
              setFieldErrors((prev) => ({ ...prev, consultationFee: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onBlur={() => handleBlur("consultationFee")}
            placeholder="500"
            hint="Standard outpatient consultation fee per visit"
          />

          {!isEdit && isAllBranches && (
            <SelectField
              label="Assigned Facility Branch *"
              required
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              <option value="">Select Branch...</option>
              {branches?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </SelectField>
          )}
        </FormSection>

        {!isEdit && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
            <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-emerald-900 block">Automated Security & Access Provisioning:</strong>
              A clinical dashboard login account will be automatically generated with temporary credentials for this doctor using the provided official email address, and will be emailed directly to them upon saving.
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/doctors")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving} className="font-bold shadow-sm">
            {isSaving ? "Saving..." : isEdit ? "Save Profile Changes" : "Onboard Doctor & Issue Credentials"}
          </Button>
        </div>
      </form>
    </div>
  );
}
