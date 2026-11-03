import { useEffect, useState } from "react";
import { useMyHospital, useUpdateMyHospital } from "../../features/hospitals";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Plus, Trash2, Globe, Heart, AlertCircle } from "lucide-react";
import { InputField, TextareaField } from "../../components/ui/Field";
import toast from "react-hot-toast";

export const HOSPITAL_INFO_LIMITS = {
  NAME: 100,
  LOGO_URL: 500,
  PHONE: 10,
  EMAIL: 100,
  ADDRESS: 250,
  HERO_BANNER_URL: 500,
  WORKING_HOURS: 100,
  GOOGLE_MAPS_LINK: 1000,
  HERO_TITLE: 150,
  HERO_SUB: 500,
  ABOUT_TEXT: 1000,
  MISSION_TEXT: 500,
  VISION_TEXT: 500,
  VALUES_TEXT: 500,
  FOOTER_TEXT: 150,
  PILLAR_TITLE: 100,
  PILLAR_DESC: 300,
  SOCIAL_URL: 300,
  FAQ_QUESTION: 200,
  FAQ_ANSWER: 1000,
} as const;

export function HospitalInfoPage() {
  const { data: hospital, isLoading } = useMyHospital();
  const updateHospital = useUpdateMyHospital();

  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    heroBannerUrl: "",
    aboutText: "",
    googleMapsLink: "",
    workingHours: "",
    footerText: "",
    socialLinks: {
      facebook: "",
      twitter: "",
      linkedin: "",
      instagram: "",
      youtube: ""
    } as Record<string, string>,
    faqs: [] as { q: string; a: string }[],
    heroTitle: "",
    heroSub: "",
    whyChooseUs: [] as { title: string; desc: string }[],
    missionText: "",
    visionText: "",
    valuesText: ""
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (hospital) {
      const socialData = (hospital as any)?.socialLinks;
      const getFieldValue = (keys: string[]) => {
        if (!socialData) return "";
        if (typeof socialData.get === "function") {
          for (const k of keys) {
            const v = socialData.get(k);
            if (v && typeof v === "string") return v;
          }
        }
        if (typeof socialData === "object") {
          for (const k of keys) {
            const v = socialData[k] || socialData[k.toLowerCase()];
            if (v && typeof v === "string") return v;
          }
        }
        return "";
      };

      setFormData({
        name: hospital.name || "",
        logoUrl: hospital.logoUrl || "",
        contactPhone: hospital.contactPhone || "",
        contactEmail: hospital.contactEmail || "",
        address: hospital.address || "",
        heroBannerUrl: (hospital as any).heroBannerUrl || "",
        aboutText: (hospital as any).aboutText || "",
        googleMapsLink: (hospital as any).googleMapsLink || "",
        workingHours: (hospital as any).workingHours || "",
        footerText: (hospital as any).footerText || "",
        socialLinks: {
          facebook: getFieldValue(["facebook", "fb"]),
          twitter: getFieldValue(["twitter", "x"]),
          linkedin: getFieldValue(["linkedin", "linkedIn", "LinkedIn"]),
          instagram: getFieldValue(["instagram", "insta"]),
          youtube: getFieldValue(["youtube", "youTube", "google"])
        } as Record<string, string>,
        faqs: (hospital as any).faqs || [],
        heroTitle: (hospital as any).heroTitle || "",
        heroSub: (hospital as any).heroSub || "",
        whyChooseUs: (hospital as any).whyChooseUs && (hospital as any).whyChooseUs.length > 0
          ? (hospital as any).whyChooseUs
          : [
              { title: "Compassionate Care", desc: "Every patient is treated with dignity, kindness, and individualized clinical attention." },
              { title: "Clinical Integrity", desc: "Highest patient safety standards, strict sanitization protocols, and medical safety regulations." },
              { title: "24/7 Availability", desc: "Round-the-clock emergency support, trauma services, ambulance, and diagnostic test labs." },
              { title: "Specialized Doctors", desc: "Attending consultants and surgeons across key departments who are masters of their fields." }
            ],
        missionText: (hospital as any).missionText || "",
        visionText: (hospital as any).visionText || "",
        valuesText: (hospital as any).valuesText || ""
      });
    }
  }, [hospital]);

  const validateField = (name: string, value: string): string | undefined => {
    const valStr = value || "";
    const trimmed = valStr.trim();

    // Hospital Name (Required)
    if (name === "name") {
      if (!trimmed) {
        return "Hospital Name is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.NAME) {
        return `Hospital Name cannot exceed ${HOSPITAL_INFO_LIMITS.NAME} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed.length < 2 || !/^[a-zA-Z0-9][a-zA-Z0-9\s.,\-_/'&()]*$/.test(trimmed)) {
        return "Hospital Name contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Logo URL (Optional)
    if (name === "logoUrl") {
      if (!trimmed) return undefined;
      if (valStr.length > HOSPITAL_INFO_LIMITS.LOGO_URL) {
        return `Logo URL cannot exceed ${HOSPITAL_INFO_LIMITS.LOGO_URL} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!/^(https?:\/\/|\/|data:image\/)/i.test(trimmed)) {
        return "Logo URL contains invalid data. Please enter a valid URL. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Contact Phone (Required)
    if (name === "contactPhone") {
      if (!trimmed) {
        return "Contact Phone is required. Field is required. Please fill out this field";
      }
      if (/[^\d]/.test(trimmed)) {
        return "Invalid phone number. Contact Phone should accept 10 digits only. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      if (trimmed.length > HOSPITAL_INFO_LIMITS.PHONE) {
        return `Contact Phone cannot exceed ${HOSPITAL_INFO_LIMITS.PHONE} digits. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed.length < 10 || /^(\d)\1{9}$/.test(trimmed)) {
        return "Please enter a valid 10-digit phone number. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Contact Email (Required)
    if (name === "contactEmail") {
      if (!trimmed) {
        return "Contact Email is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.EMAIL) {
        return `Contact Email cannot exceed ${HOSPITAL_INFO_LIMITS.EMAIL} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return "Please enter a valid email address. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Hospital Address (Required)
    if (name === "address") {
      if (!trimmed) {
        return "Hospital Address is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.ADDRESS) {
        return `Hospital Address cannot exceed ${HOSPITAL_INFO_LIMITS.ADDRESS} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed.length < 3 || /<script|javascript:|data:/i.test(trimmed) || !/^[a-zA-Z0-9\s,.\-#/'()]+$/.test(trimmed)) {
        return "Hospital Address contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Hero Banner URL (Optional)
    if (name === "heroBannerUrl") {
      if (!trimmed) return undefined;
      if (valStr.length > HOSPITAL_INFO_LIMITS.HERO_BANNER_URL) {
        return `Hero Banner URL cannot exceed ${HOSPITAL_INFO_LIMITS.HERO_BANNER_URL} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!/^(https?:\/\/|\/)/i.test(trimmed)) {
        return "Hero Banner URL contains invalid data. Please enter a valid URL. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Working Hours (Required)
    if (name === "workingHours") {
      if (!trimmed) {
        return "Working Hours (OPD / Labs) is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.WORKING_HOURS) {
        return `Working Hours (OPD / Labs) cannot exceed ${HOSPITAL_INFO_LIMITS.WORKING_HOURS} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:/i.test(trimmed) || !/^[a-zA-Z0-9\s:,\-–—()./&]+$/.test(trimmed)) {
        return "Working Hours (OPD / Labs) contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Google Maps Embed Link (Optional)
    if (name === "googleMapsLink") {
      if (!trimmed) return undefined;
      if (valStr.length > HOSPITAL_INFO_LIMITS.GOOGLE_MAPS_LINK) {
        return `Google Maps Embed Link cannot exceed ${HOSPITAL_INFO_LIMITS.GOOGLE_MAPS_LINK} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!/^https?:\/\//i.test(trimmed)) {
        return "Google Maps Embed Link contains invalid data. Please enter a valid URL. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Hero Title Banner (Required)
    if (name === "heroTitle") {
      if (!trimmed) {
        return "Hero Title Banner is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.HERO_TITLE) {
        return `Hero Title Banner cannot exceed ${HOSPITAL_INFO_LIMITS.HERO_TITLE} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return "Hero Title Banner contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Hero Subdescription Text (Required)
    if (name === "heroSub") {
      if (!trimmed) {
        return "Hero Subdescription Text is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.HERO_SUB) {
        return `Hero Subdescription Text cannot exceed ${HOSPITAL_INFO_LIMITS.HERO_SUB} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return "Hero Subdescription Text contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // About Us Description (Required)
    if (name === "aboutText") {
      if (!trimmed) {
        return "About Us Description is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.ABOUT_TEXT) {
        return `About Us Description cannot exceed ${HOSPITAL_INFO_LIMITS.ABOUT_TEXT} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return "About Us Description contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Our Mission (Required)
    if (name === "missionText") {
      if (!trimmed) {
        return "Our Mission is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.MISSION_TEXT) {
        return `Our Mission cannot exceed ${HOSPITAL_INFO_LIMITS.MISSION_TEXT} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return "Our Mission contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Our Vision (Required)
    if (name === "visionText") {
      if (!trimmed) {
        return "Our Vision is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.VISION_TEXT) {
        return `Our Vision cannot exceed ${HOSPITAL_INFO_LIMITS.VISION_TEXT} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return "Our Vision contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Our Values (Required)
    if (name === "valuesText") {
      if (!trimmed) {
        return "Our Values is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.VALUES_TEXT) {
        return `Our Values cannot exceed ${HOSPITAL_INFO_LIMITS.VALUES_TEXT} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return "Our Values contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Footer Tagline (Required)
    if (name === "footerText") {
      if (!trimmed) {
        return "Footer Tagline is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.FOOTER_TEXT) {
        return `Footer Tagline cannot exceed ${HOSPITAL_INFO_LIMITS.FOOTER_TEXT} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return "Footer Tagline contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // Pillar Title
    if (name.endsWith("_title")) {
      const pNum = name.split("_")[1];
      if (!trimmed) {
        return `Pillar #${pNum} Title is required. Field is required. Please fill out this field`;
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.PILLAR_TITLE) {
        return `Pillar #${pNum} Title cannot exceed ${HOSPITAL_INFO_LIMITS.PILLAR_TITLE} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return `Pillar #${pNum} Title contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    // Pillar Description
    if (name.endsWith("_desc")) {
      const pNum = name.split("_")[1];
      if (!trimmed) {
        return `Pillar #${pNum} Description is required. Field is required. Please fill out this field`;
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.PILLAR_DESC) {
        return `Pillar #${pNum} Description cannot exceed ${HOSPITAL_INFO_LIMITS.PILLAR_DESC} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return `Pillar #${pNum} Description contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    // Social Links (Optional)
    if (name.startsWith("social_")) {
      const platform = name.replace("social_", "");
      const platLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
      if (!trimmed) return undefined;
      if (valStr.length > HOSPITAL_INFO_LIMITS.SOCIAL_URL) {
        return `${platLabel} Link cannot exceed ${HOSPITAL_INFO_LIMITS.SOCIAL_URL} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!/^https?:\/\//i.test(trimmed)) {
        return `${platLabel} Link contains invalid data. Please enter a valid URL. Invalid data not accepted. Invalid data is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    // FAQ Question
    if (name.startsWith("faq_q_")) {
      if (!trimmed) {
        return "Question is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.FAQ_QUESTION) {
        return `Question cannot exceed ${HOSPITAL_INFO_LIMITS.FAQ_QUESTION} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return "Question contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    // FAQ Answer
    if (name.startsWith("faq_a_")) {
      if (!trimmed) {
        return "Answer is required. Field is required. Please fill out this field";
      }
      if (valStr.length > HOSPITAL_INFO_LIMITS.FAQ_ANSWER) {
        return `Answer cannot exceed ${HOSPITAL_INFO_LIMITS.FAQ_ANSWER} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (/<script|javascript:|data:|<[^>]*>/i.test(trimmed)) {
        return "Answer contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    currentLen: number,
    limit: number,
    label: string
  ) => {
    const allowedNavKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"
    ];
    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters. Too long text is not accepted. Please enter valid data`;
      setError(msg);
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handlePasteGuard = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    limit: number,
    label: string,
    currentLen: number
  ) => {
    const pasted = e.clipboardData.getData("text");
    const input = e.currentTarget;
    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? 0;
    const nextLen = currentLen - (selEnd - selStart) + pasted.length;
    if (nextLen > limit) {
      const msg = `${label} cannot exceed ${limit} characters. Too long text is not accepted. Please enter valid data`;
      setError(msg);
      toast.error(msg, { id: `${label}-paste-limit` });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "contactPhone") {
      finalValue = value.replace(/\D/g, "");
    }
    setFormData((prev) => ({
      ...prev,
      [name]: finalValue
    }));
    const err = validateField(name, finalValue);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
    if (!err && error) setError(null);
    if (err) setError(err);
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value
      }
    }));
    const err = validateField(`social_${name}`, value);
    setFieldErrors((prev) => ({ ...prev, [`social_${name}`]: err }));
    if (!err && error) setError(null);
    if (err) setError(err);
  };

  const handleWhyChooseChange = (index: number, field: "title" | "desc", value: string) => {
    setFormData((prev) => {
      const updated = [...prev.whyChooseUs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, whyChooseUs: updated };
    });
    const key = `pillar_${index + 1}_${field}`;
    const err = validateField(key, value);
    setFieldErrors((prev) => ({ ...prev, [key]: err }));
    if (!err && error) setError(null);
    if (err) setError(err);
  };

  const handleFaqChange = (index: number, field: "q" | "a", value: string) => {
    setFormData((prev) => {
      const updatedFaqs = [...prev.faqs];
      updatedFaqs[index][field] = value;
      return { ...prev, faqs: updatedFaqs };
    });
    const key = `faq_${field}_${index}`;
    const err = validateField(key, value);
    setFieldErrors((prev) => ({ ...prev, [key]: err }));
    if (!err && error) setError(null);
    if (err) setError(err);
  };

  const addFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { q: "", a: "" }]
    }));
  };

  const removeFaq = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[`faq_q_${index}`];
      delete updated[`faq_a_${index}`];
      return updated;
    });
  };

  const handleBlur = (fieldKey: string, val: string) => {
    const err = validateField(fieldKey, val);
    setFieldErrors((prev) => ({ ...prev, [fieldKey]: err }));
    if (err) {
      setError(err);
      toast.error(err, { id: `hospital-info-${fieldKey}` });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string | undefined> = {};

    // Validate standard fields
    errors.name = validateField("name", formData.name);
    errors.logoUrl = validateField("logoUrl", formData.logoUrl);
    errors.contactPhone = validateField("contactPhone", formData.contactPhone);
    errors.contactEmail = validateField("contactEmail", formData.contactEmail);
    errors.address = validateField("address", formData.address);
    errors.heroBannerUrl = validateField("heroBannerUrl", formData.heroBannerUrl);
    errors.workingHours = validateField("workingHours", formData.workingHours);
    errors.googleMapsLink = validateField("googleMapsLink", formData.googleMapsLink);
    errors.heroTitle = validateField("heroTitle", formData.heroTitle);
    errors.heroSub = validateField("heroSub", formData.heroSub);
    errors.aboutText = validateField("aboutText", formData.aboutText);
    errors.missionText = validateField("missionText", formData.missionText);
    errors.visionText = validateField("visionText", formData.visionText);
    errors.valuesText = validateField("valuesText", formData.valuesText);
    errors.footerText = validateField("footerText", formData.footerText);

    // Validate whyChooseUs
    formData.whyChooseUs.forEach((p, idx) => {
      errors[`pillar_${idx + 1}_title`] = validateField(`pillar_${idx + 1}_title`, p.title);
      errors[`pillar_${idx + 1}_desc`] = validateField(`pillar_${idx + 1}_desc`, p.desc);
    });

    // Validate socialLinks
    ["facebook", "twitter", "linkedin", "instagram", "youtube"].forEach((plat) => {
      errors[`social_${plat}`] = validateField(`social_${plat}`, formData.socialLinks[plat] || "");
    });

    // Validate faqs
    formData.faqs.forEach((faq, idx) => {
      errors[`faq_q_${idx}`] = validateField(`faq_q_${idx}`, faq.q);
      errors[`faq_a_${idx}`] = validateField(`faq_a_${idx}`, faq.a);
    });

    setFieldErrors(errors);

    const firstErr = Object.values(errors).find(Boolean);
    if (firstErr) {
      setError(firstErr);
      toast.error(firstErr, { id: "hospital-submit-error" });
      return;
    }

    updateHospital.mutate(formData, {
      onSuccess: () => {
        setSaveSuccess(true);
        toast.success("Hospital Website Info updated successfully!");
        setTimeout(() => setSaveSuccess(false), 3000);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.message || "Failed to update hospital info.";
        setError(msg);
        toast.error(msg);
      }
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading hospital configurations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Website Info</h1>
          <p className="text-sm text-slate-500">Customize all dynamic copy, links, contact details, and FAQs for your patient-facing website.</p>
        </div>
        <Button onClick={() => window.open("/#home", "_blank")} variant="secondary" className="flex items-center gap-1.5 text-xs">
          <Globe className="h-4 w-4" /> View Public Site
        </Button>
      </div>

      {saveSuccess && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm font-bold text-emerald-800 animate-in fade-in duration-200">
          ✓ Hospital Info and Public Website parameters updated successfully!
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
            <Heart className="h-5 w-5 text-navy-700" /> Core Identity &amp; Contact Parameters
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Hospital Name"
              name="name"
              required
              maxLength={HOSPITAL_INFO_LIMITS.NAME}
              showCharCount
              value={formData.name}
              error={fieldErrors.name}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.name.length, HOSPITAL_INFO_LIMITS.NAME, "Hospital Name")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.NAME, "Hospital Name", formData.name.length)}
              onBlur={() => handleBlur("name", formData.name)}
              placeholder="e.g. Speshway Hospitals"
            />

            <InputField
              label="Logo URL"
              name="logoUrl"
              maxLength={HOSPITAL_INFO_LIMITS.LOGO_URL}
              showCharCount
              value={formData.logoUrl}
              error={fieldErrors.logoUrl}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.logoUrl.length, HOSPITAL_INFO_LIMITS.LOGO_URL, "Logo URL")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.LOGO_URL, "Logo URL", formData.logoUrl.length)}
              onBlur={() => handleBlur("logoUrl", formData.logoUrl)}
              placeholder="https://example.com/logo.png"
            />

            <InputField
              label="Contact Phone"
              name="contactPhone"
              type="tel"
              required
              maxLength={HOSPITAL_INFO_LIMITS.PHONE}
              showCharCount
              value={formData.contactPhone}
              error={fieldErrors.contactPhone}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.contactPhone.length, HOSPITAL_INFO_LIMITS.PHONE, "Contact Phone")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.PHONE, "Contact Phone", formData.contactPhone.length)}
              onBlur={() => handleBlur("contactPhone", formData.contactPhone)}
              placeholder="e.g. 9876543210"
            />

            <InputField
              label="Contact Email"
              name="contactEmail"
              type="email"
              required
              maxLength={HOSPITAL_INFO_LIMITS.EMAIL}
              showCharCount
              value={formData.contactEmail}
              error={fieldErrors.contactEmail}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.contactEmail.length, HOSPITAL_INFO_LIMITS.EMAIL, "Contact Email")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.EMAIL, "Contact Email", formData.contactEmail.length)}
              onBlur={() => handleBlur("contactEmail", formData.contactEmail)}
              placeholder="contact@hospital.com"
            />

            <div className="sm:col-span-2">
              <InputField
                label="Hospital Address"
                name="address"
                required
                maxLength={HOSPITAL_INFO_LIMITS.ADDRESS}
                showCharCount
                value={formData.address}
                error={fieldErrors.address}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyGuard(e, formData.address.length, HOSPITAL_INFO_LIMITS.ADDRESS, "Hospital Address")}
                onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.ADDRESS, "Hospital Address", formData.address.length)}
                onBlur={() => handleBlur("address", formData.address)}
                placeholder="123 Health Ave, Medical District, City"
              />
            </div>

            <InputField
              label="Hero Banner URL (Optional)"
              name="heroBannerUrl"
              maxLength={HOSPITAL_INFO_LIMITS.HERO_BANNER_URL}
              showCharCount
              value={formData.heroBannerUrl}
              error={fieldErrors.heroBannerUrl}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.heroBannerUrl.length, HOSPITAL_INFO_LIMITS.HERO_BANNER_URL, "Hero Banner URL")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.HERO_BANNER_URL, "Hero Banner URL", formData.heroBannerUrl.length)}
              onBlur={() => handleBlur("heroBannerUrl", formData.heroBannerUrl)}
              placeholder="https://example.com/banner.png"
            />

            <InputField
              label="Working Hours (OPD / Labs)"
              name="workingHours"
              required
              maxLength={HOSPITAL_INFO_LIMITS.WORKING_HOURS}
              showCharCount
              value={formData.workingHours}
              error={fieldErrors.workingHours}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.workingHours.length, HOSPITAL_INFO_LIMITS.WORKING_HOURS, "Working Hours")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.WORKING_HOURS, "Working Hours", formData.workingHours.length)}
              onBlur={() => handleBlur("workingHours", formData.workingHours)}
              placeholder="Monday - Saturday (08:00 AM - 08:00 PM)"
            />

            <div className="sm:col-span-2">
              <InputField
                label="Google Maps Embed Link (iframe src URL)"
                name="googleMapsLink"
                maxLength={HOSPITAL_INFO_LIMITS.GOOGLE_MAPS_LINK}
                showCharCount
                value={formData.googleMapsLink}
                error={fieldErrors.googleMapsLink}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyGuard(e, formData.googleMapsLink.length, HOSPITAL_INFO_LIMITS.GOOGLE_MAPS_LINK, "Google Maps Embed Link")}
                onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.GOOGLE_MAPS_LINK, "Google Maps Embed Link", formData.googleMapsLink.length)}
                onBlur={() => handleBlur("googleMapsLink", formData.googleMapsLink)}
                placeholder="https://www.google.com/maps/embed?..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">Hero Section Copy</h2>
          <div className="grid grid-cols-1 gap-4">
            <InputField
              label="Hero Title Banner"
              name="heroTitle"
              required
              maxLength={HOSPITAL_INFO_LIMITS.HERO_TITLE}
              showCharCount
              value={formData.heroTitle}
              error={fieldErrors.heroTitle}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.heroTitle.length, HOSPITAL_INFO_LIMITS.HERO_TITLE, "Hero Title Banner")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.HERO_TITLE, "Hero Title Banner", formData.heroTitle.length)}
              onBlur={() => handleBlur("heroTitle", formData.heroTitle)}
              placeholder="e.g. Your Health &amp; Wellness is Our Deepest Commitment"
            />

            <TextareaField
              label="Hero Subdescription Text"
              name="heroSub"
              required
              maxLength={HOSPITAL_INFO_LIMITS.HERO_SUB}
              showCharCount
              rows={3}
              value={formData.heroSub}
              error={fieldErrors.heroSub}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.heroSub.length, HOSPITAL_INFO_LIMITS.HERO_SUB, "Hero Subdescription Text")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.HERO_SUB, "Hero Subdescription Text", formData.heroSub.length)}
              onBlur={() => handleBlur("heroSub", formData.heroSub)}
              placeholder="Brief introduction text below the hero title..."
            />
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">About Us, Mission, Vision, &amp; Values Copy</h2>
          <div className="space-y-4">
            <TextareaField
              label="About Us Description (Brief Hospital Intro)"
              name="aboutText"
              required
              maxLength={HOSPITAL_INFO_LIMITS.ABOUT_TEXT}
              showCharCount
              rows={4}
              value={formData.aboutText}
              error={fieldErrors.aboutText}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.aboutText.length, HOSPITAL_INFO_LIMITS.ABOUT_TEXT, "About Us Description")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.ABOUT_TEXT, "About Us Description", formData.aboutText.length)}
              onBlur={() => handleBlur("aboutText", formData.aboutText)}
              placeholder="Enter hospital overview..."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextareaField
                label="Our Mission"
                name="missionText"
                required
                maxLength={HOSPITAL_INFO_LIMITS.MISSION_TEXT}
                showCharCount
                rows={4}
                value={formData.missionText}
                error={fieldErrors.missionText}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyGuard(e, formData.missionText.length, HOSPITAL_INFO_LIMITS.MISSION_TEXT, "Our Mission")}
                onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.MISSION_TEXT, "Our Mission", formData.missionText.length)}
                onBlur={() => handleBlur("missionText", formData.missionText)}
                placeholder="Enter mission statements..."
              />

              <TextareaField
                label="Our Vision"
                name="visionText"
                required
                maxLength={HOSPITAL_INFO_LIMITS.VISION_TEXT}
                showCharCount
                rows={4}
                value={formData.visionText}
                error={fieldErrors.visionText}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyGuard(e, formData.visionText.length, HOSPITAL_INFO_LIMITS.VISION_TEXT, "Our Vision")}
                onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.VISION_TEXT, "Our Vision", formData.visionText.length)}
                onBlur={() => handleBlur("visionText", formData.visionText)}
                placeholder="Enter vision statements..."
              />

              <TextareaField
                label="Our Values"
                name="valuesText"
                required
                maxLength={HOSPITAL_INFO_LIMITS.VALUES_TEXT}
                showCharCount
                rows={4}
                value={formData.valuesText}
                error={fieldErrors.valuesText}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyGuard(e, formData.valuesText.length, HOSPITAL_INFO_LIMITS.VALUES_TEXT, "Our Values")}
                onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.VALUES_TEXT, "Our Values", formData.valuesText.length)}
                onBlur={() => handleBlur("valuesText", formData.valuesText)}
                placeholder="Clinical Excellence, Compassionate Treatment..."
              />
            </div>

            <InputField
              label="Footer Tagline"
              name="footerText"
              required
              maxLength={HOSPITAL_INFO_LIMITS.FOOTER_TEXT}
              showCharCount
              value={formData.footerText}
              error={fieldErrors.footerText}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyGuard(e, formData.footerText.length, HOSPITAL_INFO_LIMITS.FOOTER_TEXT, "Footer Tagline")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.FOOTER_TEXT, "Footer Tagline", formData.footerText.length)}
              onBlur={() => handleBlur("footerText", formData.footerText)}
              placeholder="e.g. Committed to clinical excellence..."
            />
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">Why Choose Our Hospital (4 Key Pillars)</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {formData.whyChooseUs.map((pillar, idx) => {
              const titleKey = `pillar_${idx + 1}_title`;
              const descKey = `pillar_${idx + 1}_desc`;
              return (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <span className="inline-block rounded bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-700 uppercase">
                    Pillar #{idx + 1}
                  </span>
                  <div>
                    <InputField
                      label={`Pillar #${idx + 1} Title`}
                      required
                      maxLength={HOSPITAL_INFO_LIMITS.PILLAR_TITLE}
                      showCharCount
                      value={pillar.title}
                      error={fieldErrors[titleKey]}
                      onChange={(e) => handleWhyChooseChange(idx, "title", e.target.value)}
                      onKeyDown={(e) => handleKeyGuard(e, pillar.title.length, HOSPITAL_INFO_LIMITS.PILLAR_TITLE, `Pillar #${idx + 1} Title`)}
                      onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.PILLAR_TITLE, `Pillar #${idx + 1} Title`, pillar.title.length)}
                      onBlur={() => handleBlur(titleKey, pillar.title)}
                      placeholder="Pillar title..."
                    />
                  </div>
                  <div>
                    <TextareaField
                      label={`Pillar #${idx + 1} Description`}
                      rows={2}
                      required
                      maxLength={HOSPITAL_INFO_LIMITS.PILLAR_DESC}
                      showCharCount
                      value={pillar.desc}
                      error={fieldErrors[descKey]}
                      onChange={(e) => handleWhyChooseChange(idx, "desc", e.target.value)}
                      onKeyDown={(e) => handleKeyGuard(e, pillar.desc.length, HOSPITAL_INFO_LIMITS.PILLAR_DESC, `Pillar #${idx + 1} Description`)}
                      onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.PILLAR_DESC, `Pillar #${idx + 1} Description`, pillar.desc.length)}
                      onBlur={() => handleBlur(descKey, pillar.desc)}
                      placeholder="Pillar description copy..."
                    />
                  </div>
                </div>
              );
            })}
            {formData.whyChooseUs.length === 0 && (
              <div className="col-span-2 text-center py-6 text-slate-400 text-xs">
                Initializing pillars...
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">Social Media Channels</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Facebook Link"
              name="facebook"
              maxLength={HOSPITAL_INFO_LIMITS.SOCIAL_URL}
              showCharCount
              value={formData.socialLinks.facebook || ""}
              error={fieldErrors.social_facebook}
              onChange={handleSocialChange}
              onKeyDown={(e) => handleKeyGuard(e, (formData.socialLinks.facebook || "").length, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "Facebook Link")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "Facebook Link", (formData.socialLinks.facebook || "").length)}
              onBlur={() => handleBlur("social_facebook", formData.socialLinks.facebook || "")}
              placeholder="https://facebook.com/..."
            />

            <InputField
              label="Twitter Link"
              name="twitter"
              maxLength={HOSPITAL_INFO_LIMITS.SOCIAL_URL}
              showCharCount
              value={formData.socialLinks.twitter || ""}
              error={fieldErrors.social_twitter}
              onChange={handleSocialChange}
              onKeyDown={(e) => handleKeyGuard(e, (formData.socialLinks.twitter || "").length, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "Twitter Link")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "Twitter Link", (formData.socialLinks.twitter || "").length)}
              onBlur={() => handleBlur("social_twitter", formData.socialLinks.twitter || "")}
              placeholder="https://twitter.com/..."
            />

            <InputField
              label="LinkedIn Link"
              name="linkedin"
              maxLength={HOSPITAL_INFO_LIMITS.SOCIAL_URL}
              showCharCount
              value={formData.socialLinks.linkedin || ""}
              error={fieldErrors.social_linkedin}
              onChange={handleSocialChange}
              onKeyDown={(e) => handleKeyGuard(e, (formData.socialLinks.linkedin || "").length, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "LinkedIn Link")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "LinkedIn Link", (formData.socialLinks.linkedin || "").length)}
              onBlur={() => handleBlur("social_linkedin", formData.socialLinks.linkedin || "")}
              placeholder="https://linkedin.com/company/..."
            />

            <InputField
              label="Instagram Link"
              name="instagram"
              maxLength={HOSPITAL_INFO_LIMITS.SOCIAL_URL}
              showCharCount
              value={formData.socialLinks.instagram || ""}
              error={fieldErrors.social_instagram}
              onChange={handleSocialChange}
              onKeyDown={(e) => handleKeyGuard(e, (formData.socialLinks.instagram || "").length, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "Instagram Link")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "Instagram Link", (formData.socialLinks.instagram || "").length)}
              onBlur={() => handleBlur("social_instagram", formData.socialLinks.instagram || "")}
              placeholder="https://instagram.com/..."
            />

            <InputField
              label="YouTube Link"
              name="youtube"
              maxLength={HOSPITAL_INFO_LIMITS.SOCIAL_URL}
              showCharCount
              value={formData.socialLinks.youtube || ""}
              error={fieldErrors.social_youtube}
              onChange={handleSocialChange}
              onKeyDown={(e) => handleKeyGuard(e, (formData.socialLinks.youtube || "").length, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "YouTube Link")}
              onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.SOCIAL_URL, "YouTube Link", (formData.socialLinks.youtube || "").length)}
              onBlur={() => handleBlur("social_youtube", formData.socialLinks.youtube || "")}
              placeholder="https://youtube.com/..."
            />
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-base font-bold text-slate-800">Frequently Asked Questions (FAQs)</h2>
            <Button type="button" onClick={addFaq} variant="secondary" className="flex items-center gap-1 text-xs py-1">
              <Plus className="h-4 w-4" /> Add FAQ
            </Button>
          </div>

          <div className="space-y-4">
            {formData.faqs.map((faq, index) => {
              const qKey = `faq_q_${index}`;
              const aKey = `faq_a_${index}`;
              return (
                <div key={index} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => removeFaq(index)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete FAQ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="w-[90%]">
                    <InputField
                      label="Question"
                      required
                      maxLength={HOSPITAL_INFO_LIMITS.FAQ_QUESTION}
                      showCharCount
                      value={faq.q}
                      error={fieldErrors[qKey]}
                      onChange={(e) => handleFaqChange(index, "q", e.target.value)}
                      onKeyDown={(e) => handleKeyGuard(e, faq.q.length, HOSPITAL_INFO_LIMITS.FAQ_QUESTION, "Question")}
                      onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.FAQ_QUESTION, "Question", faq.q.length)}
                      onBlur={() => handleBlur(qKey, faq.q)}
                      placeholder="Enter question text..."
                    />
                  </div>
                  <div>
                    <TextareaField
                      label="Answer"
                      rows={2}
                      required
                      maxLength={HOSPITAL_INFO_LIMITS.FAQ_ANSWER}
                      showCharCount
                      value={faq.a}
                      error={fieldErrors[aKey]}
                      onChange={(e) => handleFaqChange(index, "a", e.target.value)}
                      onKeyDown={(e) => handleKeyGuard(e, faq.a.length, HOSPITAL_INFO_LIMITS.FAQ_ANSWER, "Answer")}
                      onPaste={(e) => handlePasteGuard(e, HOSPITAL_INFO_LIMITS.FAQ_ANSWER, "Answer", faq.a.length)}
                      onBlur={() => handleBlur(aKey, faq.a)}
                      placeholder="Enter answer text..."
                    />
                  </div>
                </div>
              );
            })}
            {formData.faqs.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs">
                No FAQs added yet. Click &quot;Add FAQ&quot; to configure.
              </div>
            )}
          </div>
        </Card>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" disabled={updateHospital.isPending} className="bg-navy-700 px-8 py-3 text-sm">
            {updateHospital.isPending ? "Saving configuration..." : "Save Config Details"}
          </Button>
        </div>
      </form>
    </div>
  );
}
