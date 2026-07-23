import { useEffect, useState } from "react";
import { useMyHospital, useUpdateMyHospital } from "../../features/hospitals";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Plus, Trash2, Globe, Heart } from "lucide-react";

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
      instagram: ""
    },
    faqs: [] as { q: string; a: string }[],
    heroTitle: "",
    heroSub: "",
    whyChooseUs: [] as { title: string; desc: string }[],
    missionText: "",
    visionText: "",
    valuesText: ""
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (hospital) {
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
          facebook: (hospital as any).socialLinks?.facebook || "",
          twitter: (hospital as any).socialLinks?.twitter || "",
          linkedin: (hospital as any).socialLinks?.linkedin || "",
          instagram: (hospital as any).socialLinks?.instagram || ""
        },
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

  const handleWhyChooseChange = (index: number, field: "title" | "desc", value: string) => {
    setFormData((prev) => {
      const updated = [...prev.whyChooseUs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, whyChooseUs: updated };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
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
  };

  const handleFaqChange = (index: number, field: "q" | "a", value: string) => {
    setFormData((prev) => {
      const updatedFaqs = [...prev.faqs];
      updatedFaqs[index][field] = value;
      return { ...prev, faqs: updatedFaqs };
    });
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateHospital.mutate(formData, {
      onSuccess: () => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
            <Heart className="h-5 w-5 text-navy-700" /> Core Identity & Contact Parameters
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hospital Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Logo URL</label>
              <input
                type="text"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Phone</label>
              <input
                type="text"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hospital Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hero Banner URL (Optional)</label>
              <input
                type="text"
                name="heroBannerUrl"
                value={formData.heroBannerUrl}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="https://example.com/banner.png"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Working Hours (OPD / Labs)</label>
              <input
                type="text"
                name="workingHours"
                value={formData.workingHours}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="Monday - Saturday (08:00 AM - 08:00 PM)"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Google Maps Embed Link (iframe src URL)</label>
              <input
                type="text"
                name="googleMapsLink"
                value={formData.googleMapsLink}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="https://www.google.com/maps/embed?..."
              />
            </div>
          </div>
        </Card>        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">Hero Section Copy</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hero Title Banner</label>
              <input
                type="text"
                name="heroTitle"
                value={formData.heroTitle}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="e.g. Your Health & Wellness is Our Deepest Commitment"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hero Subdescription Text</label>
              <textarea
                name="heroSub"
                rows={3}
                value={formData.heroSub}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="Brief introduction text below the hero title..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">About Us, Mission, Vision, & Values Copy</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">About Us Description (Brief Hospital Intro)</label>
              <textarea
                name="aboutText"
                rows={4}
                value={formData.aboutText}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="Enter hospital overview..."
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Our Mission</label>
                <textarea
                  name="missionText"
                  rows={4}
                  value={formData.missionText}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                  placeholder="Enter mission statements..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Our Vision</label>
                <textarea
                  name="visionText"
                  rows={4}
                  value={formData.visionText}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                  placeholder="Enter vision statements..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Our Values</label>
                <textarea
                  name="valuesText"
                  rows={4}
                  value={formData.valuesText}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                  placeholder="Clinical Excellence, Compassionate Treatment..."
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Footer Tagline</label>
              <input
                type="text"
                name="footerText"
                value={formData.footerText}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="e.g. Committed to clinical excellence..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">Why Choose Our Hospital (4 Key Pillars)</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {formData.whyChooseUs.map((pillar, idx) => (
              <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <span className="inline-block rounded bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-700 uppercase">
                  Pillar #{idx + 1}
                </span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={pillar.title}
                    onChange={(e) => handleWhyChooseChange(idx, "title", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500"
                    placeholder="Pillar title..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                  <textarea
                    rows={2}
                    required
                    value={pillar.desc}
                    onChange={(e) => handleWhyChooseChange(idx, "desc", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-navy-500"
                    placeholder="Pillar description copy..."
                  />
                </div>
              </div>
            ))}
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
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Facebook link</label>
              <input
                type="text"
                name="facebook"
                value={formData.socialLinks.facebook}
                onChange={handleSocialChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Twitter Link</label>
              <input
                type="text"
                name="twitter"
                value={formData.socialLinks.twitter}
                onChange={handleSocialChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="https://twitter.com/..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LinkedIn Link</label>
              <input
                type="text"
                name="linkedin"
                value={formData.socialLinks.linkedin}
                onChange={handleSocialChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="https://linkedin.com/company/..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instagram Link</label>
              <input
                type="text"
                name="instagram"
                value={formData.socialLinks.instagram}
                onChange={handleSocialChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
                placeholder="https://instagram.com/..."
              />
            </div>
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
            {formData.faqs.map((faq, index) => (
              <div key={index} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => removeFaq(index)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="w-[90%]">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Question</label>
                  <input
                    type="text"
                    required
                    value={faq.q}
                    onChange={(e) => handleFaqChange(index, "q", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500"
                    placeholder="Enter question text..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Answer</label>
                  <textarea
                    rows={2}
                    required
                    value={faq.a}
                    onChange={(e) => handleFaqChange(index, "a", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500"
                    placeholder="Enter answer text..."
                  />
                </div>
              </div>
            ))}
            {formData.faqs.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs">
                No FAQs added yet. Click "Add FAQ" to configure.
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" disabled={updateHospital.isPending} className="bg-navy-700 px-8 py-3 text-sm">
            {updateHospital.isPending ? "Saving configuration..." : "Save Config Details"}
          </Button>
        </div>
      </form>
    </div>
  );
}
