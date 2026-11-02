import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserPlus, GraduationCap, ShieldCheck, Copy, AlertCircle } from "lucide-react";
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

const DOCTOR_LIMITS = {
  NAME: 100,
  EMAIL: 100,
  PHONE: 10,
  SPECIALIZATION: 100,
  QUALIFICATION: 100,
  LICENSE_NO: 50,
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
  const { data: departments } = useDepartments({ activeOnly: true });
  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor(id ?? "");

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
    status: "on_duty" as "on_duty" | "on_leave" | "off_duty",
    rating: 0,
    opExpiryLimit: 10,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    if (!isEdit) {
      api.get("/staff/next-employee-id", { params: { role: "doctor" } })
        .then((res) => {
          const nextId = res.data.data?.employeeId;
          if (nextId) {
            setForm((prev) => ({ ...prev, licenseNo: nextId }));
            setFieldErrors((prev) => ({ ...prev, licenseNo: undefined }));
          }
        })
        .catch(() => {});
    }
  }, [isEdit]);

  useEffect(() => {
    if (data?.doctor) {
      const doctor = data.doctor;
      setForm({
        name: doctor.name || "",
        gender: (doctor as any).gender || "Male",
        email: doctor.email || "",
        phone: doctor.phone || "",
        photoUrl: doctor.photoUrl || "",
        bio: doctor.bio || "",
        department: typeof doctor.department === "object" && doctor.department ? doctor.department._id : "",
        specialization: doctor.specialization || "",
        qualification: doctor.qualification || "",
        licenseNo: doctor.licenseNo || "",
        status: doctor.status || "on_duty",
        rating: doctor.rating ?? 0,
        opExpiryLimit: doctor.opExpiryLimit ?? 10,
      });
      setFieldErrors({});
    }
  }, [data]);

  const validateField = (
    field:
      | "name"
      | "gender"
      | "email"
      | "phone"
      | "specialization"
      | "qualification"
      | "licenseNo"
      | "bio"
      | "photoUrl"
      | "rating"
      | "opExpiryLimit",
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
      if (!trimmed) {
        if (valStr.length > 0) return "Please enter valid data";
        return undefined;
      }
      if (valStr.length > DOCTOR_LIMITS.SPECIALIZATION) {
        return `Specialization cannot exceed ${DOCTOR_LIMITS.SPECIALIZATION} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !SPECIALIZATION_REGEX.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
        return "Specialization contains invalid data. Please enter valid data";
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
        return "Doctor / License ID contains invalid data. Must contain only letters, numbers, hyphens, and underscores. Please enter valid data";
      }
      return undefined;
    }

    if (field === "bio") {
      if (valStr.length > DOCTOR_LIMITS.BIO) {
        return `Bio / Statement cannot exceed ${DOCTOR_LIMITS.BIO} characters. Please enter valid data`;
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

    if (field === "rating") {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) {
        return "Patient Satisfaction Rating must be between 0 and 100. Please enter valid data";
      }
      return undefined;
    }

    if (field === "opExpiryLimit") {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        return "OP Consultation Expiry Limit must be at least 0 days. Please enter valid data";
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
      const msg = "Invalid phone number. Phone Number should accept 10 digits only. Please enter valid data";
      setError("Please enter valid data");
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${label}-digit-only` });
      return;
    }

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = isPhone
        ? `${label} cannot exceed ${limit} digits. Please enter valid data`
        : `${label} cannot exceed ${limit} characters. Please enter valid data`;
      setError("Please enter valid data");
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handleBlur = (
    field:
      | "name"
      | "gender"
      | "email"
      | "phone"
      | "specialization"
      | "qualification"
      | "licenseNo"
      | "bio"
      | "rating"
      | "opExpiryLimit"
  ) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setError("Please enter valid data");
      toast.error(err, { id: `doctor-${field}-error` });
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const nameErr = validateField("name", form.name);
    const genderErr = validateField("gender", form.gender);
    const emailErr = validateField("email", form.email);
    const phoneErr = validateField("phone", form.phone);
    const specErr = validateField("specialization", form.specialization);
    const qualErr = validateField("qualification", form.qualification);
    const licErr = validateField("licenseNo", form.licenseNo);
    const bioErr = validateField("bio", form.bio);
    const photoErr = validateField("photoUrl", form.photoUrl);
    const ratingErr = validateField("rating", form.rating);
    const opExpiryLimitErr = validateField("opExpiryLimit", form.opExpiryLimit);

    const errors: Record<string, string | undefined> = {
      name: nameErr,
      gender: genderErr,
      email: emailErr,
      phone: phoneErr,
      specialization: specErr,
      qualification: qualErr,
      licenseNo: licErr,
      bio: bioErr,
      photoUrl: photoErr,
      rating: ratingErr,
      opExpiryLimit: opExpiryLimitErr,
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
      bio: true,
      photoUrl: true,
      rating: true,
      opExpiryLimit: true,
    });

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      const firstError = Object.values(errors).find(Boolean);
      setError("Please enter valid data");
      toast.error(firstError || "Please enter valid data", { id: "doctor-form-invalid" });
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      specialization: form.specialization.trim(),
      qualification: form.qualification.trim(),
      licenseNo: form.licenseNo.trim(),
      bio: form.bio.trim(),
      department: form.department || null,
    };

    try {
      if (isEdit) {
        await updateDoctor.mutateAsync(payload);
        toast.success("Doctor updated successfully!");
        navigate("/admin/doctors");
      } else {
        const result = await createDoctor.mutateAsync(payload);
        toast.success("Doctor created successfully!");
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

  // ── Credential reveal screen (shown once after creation) ─────────────────────
  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </div>
          <h2 className="text-center text-lg font-semibold text-slate-800">Doctor Account Created</h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            Share these temporary credentials with the doctor securely — the password is shown only once.
          </p>
          <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-800">{created.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Temporary Password</span>
              <span className="flex items-center gap-2 font-mono font-medium text-slate-800">
                {created.tempPassword}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(created.tempPassword);
                    toast.success("Password copied to clipboard!");
                  }}
                  className="text-slate-400 hover:text-navy-700"
                  title="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-amber-600">
            ⚠️ The doctor should change this password after first login via Settings.
          </p>
          <Button
            variant="primary"
            className="mt-6 w-full justify-center"
            onClick={() => navigate("/admin/doctors")}
          >
            Done
          </Button>
        </Card>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/admin/doctors" className="hover:text-navy-700">
            Doctors
          </Link>{" "}
          &gt; {isEdit ? "Edit Doctor" : "Add New Doctor"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Doctor" : "Registration Portal"}</h1>
        <p className="text-sm text-slate-500">
          {isEdit
            ? "Update the doctor's profile and credentials."
            : "Fill in the details below. A login account with a temporary password will be created automatically using the email address provided."}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection icon={UserPlus} title="Personal Information">
          <InputField
            label="Full Name"
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
            placeholder="e.g. Sarah J. Montgomery"
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
            label="Email Address (used for login)"
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
            placeholder="sarah.m@medicenter.com"
          />
          <InputField
            label="Phone Number"
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
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
          >
            <option value="on_duty">On Duty</option>
            <option value="on_leave">On Leave</option>
            <option value="off_duty">Off Duty</option>
          </SelectField>
          <div className="sm:col-span-2">
            <TextareaField
              label="Bio / Statement"
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
              placeholder="Brief professional summary..."
              rows={3}
            />
          </div>
          <div className="sm:col-span-2">
            <FileUpload
              label="Photo"
              folder="doctor-photos"
              value={form.photoUrl}
              onChange={(url) => {
                setForm({ ...form, photoUrl: url });
                setFieldErrors((prev) => ({ ...prev, photoUrl: undefined }));
              }}
              maxSizeMB={2}
              hint="PNG, JPEG, WEBP, SVG up to 2MB"
              error={fieldErrors.photoUrl}
              onError={(err) => setFieldErrors((prev) => ({ ...prev, photoUrl: err || undefined }))}
            />
          </div>
        </FormSection>

        <FormSection icon={GraduationCap} title="Professional Credentials">
          <SelectField
            label="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          >
            <option value="">Select Department</option>
            {departments?.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <InputField
            label="Specialization"
            maxLength={DOCTOR_LIMITS.SPECIALIZATION}
            showCharCount
            value={form.specialization}
            error={fieldErrors.specialization}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, specialization: val });
              const err = validateField("specialization", val);
              setFieldErrors((prev) => ({ ...prev, specialization: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "specialization", form.specialization.length, DOCTOR_LIMITS.SPECIALIZATION, "Specialization")}
            onBlur={() => handleBlur("specialization")}
            placeholder="e.g. Cardiology"
          />
          <InputField
            label="Qualification"
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
            placeholder="e.g. MD, FACC, PhD"
          />
          <InputField
            label="Doctor / License ID (Auto-Generated)"
            required
            maxLength={DOCTOR_LIMITS.LICENSE_NO}
            showCharCount
            value={form.licenseNo}
            error={fieldErrors.licenseNo}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, licenseNo: val });
              const err = validateField("licenseNo", val);
              setFieldErrors((prev) => ({ ...prev, licenseNo: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "licenseNo", form.licenseNo.length, DOCTOR_LIMITS.LICENSE_NO, "Doctor / License ID")}
            onBlur={() => handleBlur("licenseNo")}
            placeholder="Auto-generating Doctor ID..."
            hint="Role prefix: DOC (Unique hospital & branch doctor ID)"
          />
          <InputField
            label="Patient Satisfaction Rating (0-100)"
            type="number"
            min={0}
            max={100}
            value={form.rating}
            error={fieldErrors.rating}
            onChange={(e) => {
              const val = Number(e.target.value);
              setForm({ ...form, rating: val });
              const err = validateField("rating", val);
              setFieldErrors((prev) => ({ ...prev, rating: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onBlur={() => handleBlur("rating")}
          />
          <InputField
            label="OP Consultation Expiry Limit (Days)"
            type="number"
            min={0}
            value={form.opExpiryLimit}
            error={fieldErrors.opExpiryLimit}
            onChange={(e) => {
              const val = Number(e.target.value);
              setForm({ ...form, opExpiryLimit: val });
              const err = validateField("opExpiryLimit", val);
              setFieldErrors((prev) => ({ ...prev, opExpiryLimit: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onBlur={() => handleBlur("opExpiryLimit")}
          />
        </FormSection>

        {!isEdit && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <strong>Note:</strong> A dashboard login account will be automatically created for this doctor using the email address above. A temporary password will be shown after submission.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/doctors")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Doctor" : "Create Doctor & Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}
