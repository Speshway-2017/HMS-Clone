import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isElectron } from "../../utils/electron";
import toast from "react-hot-toast";
import DepthParallaxWords from "../../components/ui/DepthParallaxWords";
import GlowHover, { GlowHoverCard, GlowHoverItem } from "../../components/ui/GlowHoverCard";
import SocialSelector from "../../components/ui/SocialSelector";
import GooeyPopover from "../../components/ui/GooeyPopover";
import { MotionAccordion } from "../../components/ui/MotionAccordion";
import { DepartmentTiltCard } from "../../components/ui/DepartmentTiltCard";
import { AnimatedList } from "../../components/ui/AnimatedList";
import {
  Building2,
  Stethoscope,
  Users2,
  ArrowRight,
  Menu,
  X,
  Lock,
  Activity,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowUpRight,
  Sparkles,
  Heart,
  Shield,
  Clock3,
  Award,
  FileText,
  Search,
  Star,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import GooeyPopoverComponent from "../../components/ui/GooeyPopover";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { usePublicHospital } from "../../features/hospitals";
import { useBlogs, BlogPost } from "../../features/blogs";
import { api } from "../../lib/api";

function getEmbeddableMapUrl(url: string, fallbackAddress: string): string {
  if (!url) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  // If it's already an embed link, return it
  if (url.includes("/embed") || url.includes("output=embed")) {
    return url;
  }

  // Check for coordinates like @17.4504068,78.3843842
  const coordRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = url.match(coordRegex);
  if (match) {
    const [_, lat, lng] = match;
    return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  // Fallback: If it's a URL but not embeddable, search for address if we can extract query params,
  // or construct a query embed using the input URL itself as a search query if it is just a search string
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsedUrl = new URL(url);
      const q = parsedUrl.searchParams.get("q");
      if (q) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      }
    } catch (e) {
      // Ignore URL parse errors
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  // If the input is not a URL but a text search/address, embed it directly!
  return `https://maps.google.com/maps?q=${encodeURIComponent(url)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

export function LandingPage() {
  if (isElectron()) {
    return <Navigate to="/login" replace />;
  }

  const { data: hospital } = usePublicHospital();
  const hospitalName = hospital?.name || "Sunrise General Hospital";
  const logoUrl = hospital?.logoUrl;
  const address = hospital?.address || "80 Feet Road, Koramangala, Bengaluru, KA 560034";
  const phone = hospital?.contactPhone || "+91 (80) 4567 8901";
  const email = hospital?.contactEmail || "contact@sunrisehospital.com";
  const workingHours = hospital?.workingHours || "Monday - Saturday: 08:00 AM - 08:00 PM (Emergency 24/7)";
  const heroBannerUrl = hospital?.heroBannerUrl;
  const aboutText = hospital?.aboutText || "Sunrise General Hospital is committed to providing compassionate, high-quality, patient-centric healthcare services. With our state-of-the-art facilities, modern diagnostic laboratories, and an experienced team of medical practitioners, we ensure that you and your loved ones receive the best possible clinical care. From emergency trauma services to outpatient consultations, we are here for you 24/7.";
  const googleMapsLink = hospital?.googleMapsLink || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.750247477546!2d77.6223405757754!3d12.923766787386766!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae148ebffffff%3A0x6bde35501869e5d4!2sKoramangala%2080%20Feet%20Rd%2C%20Bengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin";
  const footerText = hospital?.footerText || "Serving our community with integrity, compassion, and clinical excellence. Your health is our first priority.";
  const faqs = hospital?.faqs || [];
  const displayFaqs = faqs;

  const formatSocialUrl = (url?: any): string | null => {
    if (!url) return null;
    let str = "";
    if (typeof url === "string") {
      str = url.trim();
    } else if (typeof url === "number") {
      str = String(url).trim();
    }
    if (!str || str === "[object Object]" || str === "undefined" || str === "null") return null;
    if (/^https?:\/\//i.test(str)) return str;
    if (/^\/\//.test(str)) return `https:${str}`;
    return `https://${str}`;
  };

  const getAdminSocialLink = (keyNames: string[], defaultFallback: string): string => {
    if (!hospital?.socialLinks) return defaultFallback;
    const links = hospital.socialLinks as any;

    // 1. Check Map get interface if present
    if (typeof links?.get === "function") {
      for (const key of keyNames) {
        const val = links.get(key);
        const formatted = formatSocialUrl(val);
        if (formatted) return formatted;
      }
    }

    // 2. Convert to plain JS object if Mongoose document or Map
    let plainObj: Record<string, any> = links;
    if (typeof links?.toJSON === "function") {
      plainObj = links.toJSON();
    } else if (typeof links?.toObject === "function") {
      plainObj = links.toObject();
    }

    if (typeof plainObj === "object" && plainObj !== null) {
      // Direct property lookup
      for (const key of keyNames) {
        if (key in plainObj) {
          const formatted = formatSocialUrl(plainObj[key]);
          if (formatted) return formatted;
        }
      }
      // Case-insensitive lookup across plainObj keys
      const keys = Object.keys(plainObj);
      for (const keyName of keyNames) {
        const matchKey = keys.find((k) => k.toLowerCase() === keyName.toLowerCase());
        if (matchKey) {
          const formatted = formatSocialUrl(plainObj[matchKey]);
          if (formatted) return formatted;
        }
      }
    }

    return defaultFallback;
  };

  const socialLinks = {
    facebook: getAdminSocialLink(["facebook", "Facebook", "fb", "FB", "facebookUrl"], "https://facebook.com"),
    twitter: getAdminSocialLink(["twitter", "Twitter", "x", "X", "twitterUrl", "xUrl"], "https://twitter.com"),
    linkedin: getAdminSocialLink(["linkedin", "LinkedIn", "linkedIn", "linkedinUrl"], "https://linkedin.com"),
    youtube: getAdminSocialLink(["youtube", "YouTube", "youTube", "youtubeUrl", "yt", "YT", "google", "Google"], "https://youtube.com"),
    instagram: getAdminSocialLink(["instagram", "Instagram", "insta", "Insta", "instagramUrl"], "https://instagram.com")
  };

  const heroTitle = hospital?.heroTitle || "Your Health & Wellness is Our Deepest Commitment";
  const heroSub = hospital?.heroSub || `At ${hospitalName}, we offer compassionate, state-of-the-art care. Book appointments with our highly-trained clinical specialists, discover our departments, and receive trust-grade clinical treatments.`;
  const whyChooseUs = hospital?.whyChooseUs && hospital.whyChooseUs.length > 0
    ? hospital.whyChooseUs
    : [
      { title: "Compassionate Care", desc: "Every patient is treated with dignity, kindness, and individualized clinical attention." },
      { title: "Clinical Integrity", desc: "Highest patient safety standards, strict sanitization protocols, and medical safety regulations." },
      { title: "24/7 Availability", desc: "Round-the-clock emergency support, trauma services, ambulance, and diagnostic test labs." },
      { title: "Specialized Doctors", desc: "Attending consultants and surgeons across key departments who are masters of their fields." }
    ];
  const missionText = hospital?.missionText || "To deliver high-quality, compassionate clinical care using cutting-edge diagnostics, ensuring patient health remains our primary standard.";
  const visionText = hospital?.visionText || "To lead as a regional medical beacon of safety, integrating advanced clinical intelligence to make high-standard treatment accessible.";
  const valuesText = hospital?.valuesText || "Clinical Excellence, Compassionate Treatment, Operational Integrity, and Sovereignty over Patient Privacy.";

  const embedMapUrl = getEmbeddableMapUrl(googleMapsLink, address);

  const [activeTab, setActiveTab] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const animateBubblyButton = (e: React.MouseEvent<HTMLButtonElement>, callback?: () => void) => {
    const btn = e.currentTarget;
    btn.classList.remove("animate");
    void btn.offsetWidth;
    btn.classList.add("animate");
    setTimeout(() => {
      btn.classList.remove("animate");
      if (callback) callback();
    }, 700);
  };

  // --- QUERY DEPARTMENTS & DOCTORS ---
  const { data: rawDepartments = [] } = useQuery({
    queryKey: ["public", "departments"],
    queryFn: async () => {
      const res = await api.get("/hospitals/public/departments");
      return res.data.data.departments as any[];
    }
  });

  // Deduplicate departments array by ID and trim/lowercased name to remove any duplicates
  const departments = (rawDepartments || []).reduce((acc: any[], dept: any) => {
    if (!dept) return acc;
    const isDuplicate = acc.some(
      (existing) =>
        (dept._id && existing._id === dept._id) ||
        (existing.name && dept.name && existing.name.trim().toLowerCase() === dept.name.trim().toLowerCase())
    );
    if (!isDuplicate) {
      acc.push(dept);
    }
    return acc;
  }, []);

  const { data: doctors = [] } = useQuery({
    queryKey: ["public", "doctors"],
    queryFn: async () => {
      const res = await api.get("/hospitals/public/doctors");
      const list = res.data?.data?.doctors || res.data?.doctors || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: branchesData = [] } = useQuery({
    queryKey: ["public", "branches"],
    queryFn: async () => {
      try {
        const res = await api.get("/hospitals/public/branches");
        return res.data?.data?.branches || res.data?.branches || [];
      } catch {
        const fallbackRes = await api.get("/branches").catch(() => null);
        return fallbackRes?.data?.data?.branches || fallbackRes?.data?.branches || fallbackRes?.data?.data || [];
      }
    }
  });
  const branches = branchesData || [];

  const { data: publicBlogs = [] } = useBlogs({ publishedOnly: true });
  const [selectedBlogModal, setSelectedBlogModal] = useState<BlogPost | null>(null);

  // Extract all services dynamically
  const dynamicServices = departments.reduce((acc: { service: string; deptName: string }[], dept) => {
    if (dept.services && Array.isArray(dept.services)) {
      dept.services.forEach((s: string) => {
        if (s && !acc.some((x) => x.service.toLowerCase() === s.toLowerCase())) {
          acc.push({ service: s, deptName: dept.name });
        }
      });
    }
    return acc;
  }, []);

  // Construct GlowHover items for Services section
  const serviceHoverItems: GlowHoverItem[] = (departments || [])
    .filter((dept: any) => (dept.services || []).length > 0)
    .map((dept: any) => {
      const deptServices = dept.services || [];
      return {
        id: dept._id || `dept-service-${dept.name}`,
        element: (
          <div className="grid min-w-[260px] flex-1 grid-rows-[auto_auto_1fr] items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 text-slate-800 shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700 font-bold shadow-xs">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-slate-900">{dept.name}</h2>
                  <span className="block text-[10px] font-bold tracking-wider text-navy-700 uppercase">
                    {dept.specialization || "Clinical Division"}
                  </span>
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed mt-2">
                {dept.description || `Specialized diagnostic checkups and treatment protocols provided by ${dept.name} medical team.`}
              </p>
            </div>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-700 pt-3 border-t border-slate-100">
              {deptServices.map((srv: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-slate-700">{srv}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 self-end w-full">
              <button
                onClick={() => changeTab("doctors")}
                className="w-full rounded-xl bg-navy-700 py-2.5 px-4 text-center font-bold text-xs text-white shadow-sm hover:bg-navy-800 transition-colors flex items-center justify-center gap-2"
              >
                <span>Book Doctor Appointment</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ),
      };
    });

  // --- BOOKING FORM STATE ---
  const [bookingForm, setBookingForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "Male",
    age: "",
    departmentId: "",
    doctorId: "",
    date: "",
    time: "",
    chiefComplaint: ""
  });
  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);

  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [doctorSearchQuery, setDoctorSearchQuery] = useState<string>("");
  const [selectedDoctorForProfile, setSelectedDoctorForProfile] = useState<any | null>(null);

  // Extract unique specializations
  const doctorSpecializations = Array.from(
    new Set(
      doctors
        .map((d: any) => {
          const specName = d.specialization || (typeof d.department === "object" && d.department ? d.department.name : d.department);
          return specName ? String(specName).trim() : null;
        })
        .filter(Boolean)
    )
  ) as string[];

  // Filter doctors based on branch, specialization & search query
  const catalogDoctors = doctors.filter((doc: any) => {
    const docName = String(doc.name || (typeof doc.user === "object" ? doc.user?.name : doc.user) || "").toLowerCase();
    const spec = String(doc.specialization || (typeof doc.department === "object" && doc.department ? doc.department.name : doc.department) || "").toLowerCase();
    const qual = String(doc.qualification || doc.qualifications || "").toLowerCase();

    const docBranchId = doc.branch?._id || doc.branch?.id || doc.branch || "";
    const docBranchName = typeof doc.branch === "object" && doc.branch ? (doc.branch.name || "") : "";

    const branchMatch =
      selectedBranchId === "all" ||
      docBranchId === selectedBranchId ||
      String(docBranchId) === String(selectedBranchId) ||
      (docBranchName && docBranchName.toLowerCase().includes(selectedBranchId.toLowerCase()));

    const specMatch =
      selectedSpecialization === "all" ||
      spec === selectedSpecialization.toLowerCase() ||
      spec.includes(selectedSpecialization.toLowerCase());
    const queryMatch =
      !doctorSearchQuery ||
      docName.includes(doctorSearchQuery.toLowerCase().trim()) ||
      spec.includes(doctorSearchQuery.toLowerCase().trim()) ||
      qual.includes(doctorSearchQuery.toLowerCase().trim());

    return branchMatch && specMatch && queryMatch;
  });

  // Filter doctors based on selected department for booking form
  const filteredDoctors = bookingForm.departmentId
    ? doctors.filter((doc) => doc.department?._id === bookingForm.departmentId)
    : doctors;

  // --- CONTACT FORM STATE ---
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // --- HASH ROUTER SYNC ---
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "book") {
        window.location.hash = "#doctors";
        setActiveTab("doctors");
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const validTabs = [
        "home",
        "about",
        "departments",
        "doctors",
        "services",
        "blog",
        "contact",
        "privacy",
        "terms",
        "cookie"
      ];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setActiveTab("home");
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Update Page Title
  useEffect(() => {
    document.title = `${hospitalName} | Clean, Patient-Focused Care`;
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

  const changeTab = (tabName: string) => {
    window.location.hash = `#${tabName}`;
  };

  // --- APPOINTMENT MUTATION ---
  const appointmentMutation = useMutation({
    mutationFn: async (payload: typeof bookingForm) => {
      const res = await api.post("/hospitals/public/appointments", payload);
      return res.data.data.appointment;
    },
    onSuccess: (data) => {
      setBookingSuccessData(data);
      setBookingForm({
        name: "",
        email: "",
        phone: "",
        gender: "Male",
        age: "",
        departmentId: "",
        doctorId: "",
        date: "",
        time: "",
        chiefComplaint: ""
      });
    }
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    appointmentMutation.mutate(bookingForm);
  };

  // --- ENQUIRY MUTATION ---
  const enquiryMutation = useMutation({
    mutationFn: async (payload: typeof contactForm) => {
      const res = await api.post("/hospitals/public/enquiries", payload);
      return res.data;
    },
    onSuccess: () => {
      setContactSubmitted(true);
      setContactForm({ name: "", email: "", subject: "", message: "" });
    }
  });

  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [isSubmittedContact, setIsSubmittedContact] = useState(false);
  const [isFloatingContactOpen, setIsFloatingContactOpen] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingContact || isSubmittedContact) return;

    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      toast.error("Please fill in your full name, email, and message.");
      return;
    }

    setIsSubmittingContact(true);
    try {
      await api.post("/hospitals/public/enquiries", {
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        subject: "General Enquiry",
        message: contactForm.message.trim(),
      });

      setIsSubmittingContact(false);
      setIsSubmittedContact(true);
      toast.success("Thank you! Your contact message has been sent successfully.");

      setTimeout(() => {
        setIsSubmittedContact(false);
        setIsFloatingContactOpen(false);
        setContactForm({ name: "", email: "", subject: "", message: "" });
      }, 1800);
    } catch (err: any) {
      console.error("Error submitting contact message:", err);
      setIsSubmittingContact(false);
      toast.error(err?.response?.data?.message || "Failed to send message. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 font-sans antialiased overflow-x-clip selection:bg-navy-600 selection:text-white">

      {/* SVG Gooey Filter Definition */}
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 21 -7" result="goo" />
            <feBlend in2="goo" in="SourceGraphic" result="mix" />
          </filter>
        </defs>
      </svg>

      {/* --- GLASSMORPHIC NAV BAR --- */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-xl transition-all duration-300">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-6 lg:px-8">

          {/* Logo / Hospital Name */}
          <div
            onClick={() => changeTab("home")}
            className="flex cursor-pointer items-center gap-3 text-lg lg:text-xl font-extrabold tracking-tight text-navy-900 shrink-0"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={hospitalName} className="h-9 w-9 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-navy-700 to-navy-900 text-white shadow-md">
                <Activity className="h-5 w-5" />
              </div>
            )}
            <span className="bg-gradient-to-r from-navy-900 to-navy-700 bg-clip-text text-transparent">
              {hospitalName}
            </span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden items-center gap-5 xl:gap-8 text-sm font-semibold text-slate-600 lg:flex shrink-0">
            {[
              { id: "home", label: "Home" },
              { id: "about", label: "About Us" },
              { id: "departments", label: "Departments" },
              { id: "doctors", label: "Doctors" },
              { id: "services", label: "Services" },
              { id: "blog", label: "Blog" },
              { id: "contact", label: "Contact Us" }
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => changeTab(nav.id)}
                className={`nav-hover-underline transition-colors hover:text-[#0505a9] py-1 ${activeTab === nav.id ? "text-[#0505a9] font-bold active" : "text-slate-600"
                  }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          {/* Nav Actions */}
          <div className="hidden items-center gap-4 shrink-0 lg:flex">
            <Link to="/login">
              <button className="nav-hover-underline text-sm font-bold text-slate-700 hover:text-[#0505a9] py-1">
                Login
              </button>
            </Link>
            <button
              onClick={() => changeTab("doctors")}
              className="blob-btn blob-btn--sm blob-btn--reverse"
            >
              <span className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap">
                Book Appointment
              </span>
              <span className="blob-btn__inner">
                <span className="blob-btn__blobs">
                  <span className="blob-btn__blob"></span>
                  <span className="blob-btn__blob"></span>
                  <span className="blob-btn__blob"></span>
                  <span className="blob-btn__blob"></span>
                </span>
              </span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white p-6 shadow-xl lg:hidden transition-all duration-200 ease-in-out">
            <div className="flex flex-col gap-4 text-base font-semibold">
              {[
                { id: "home", label: "Home" },
                { id: "about", label: "About Us" },
                { id: "departments", label: "Departments" },
                { id: "doctors", label: "Doctors" },
                { id: "services", label: "Services" },
                { id: "blog", label: "Blog" },
                { id: "contact", label: "Contact Us" }
              ].map((nav) => (
                <button
                  key={nav.id}
                  onClick={() => changeTab(nav.id)}
                  className={`text-left py-2 transition-all duration-250 hover:text-navy-700 ${activeTab === nav.id ? "text-navy-700 font-bold border-l-2 border-navy-700 pl-2" : ""
                    }`}
                >
                  {nav.label}
                </button>
              ))}
              <hr className="my-2 border-slate-100" />
              <div className="flex flex-col gap-3">
                <Link to="/login" className="w-full">
                  <Button variant="secondary" className="w-full py-2.5">
                    Login
                  </Button>
                </Link>
                <Button onClick={() => changeTab("doctors")} variant="primary" className="w-full py-2.5 bg-navy-700">
                  Book Appointment
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* --- RENDER VIEW STATE CONTAINER --- */}
      <main className="flex-1">

        {/* --- VIEW: HOME --- */}
        {activeTab === "home" && (
          <div className="transition-all duration-300 ease-in-out">

            {/* Hero Section */}
            <section className="relative px-6 pb-16 pt-8 lg:px-12 lg:pb-24 lg:pt-12 bg-gradient-to-b from-white via-slate-50 to-slate-50 overflow-hidden">
              <div aria-hidden className="pointer-events-none absolute -right-[15%] -top-[10%] h-[500px] w-[500px] rounded-full bg-navy-100/40 blur-3xl opacity-60" />
              <div aria-hidden className="pointer-events-none absolute -left-[10%] top-[40%] h-[400px] w-[400px] rounded-full bg-emerald-50/40 blur-3xl opacity-50" />

              <div className="mx-auto grid max-w-[1600px] grid-cols-1 items-center gap-12 lg:grid-cols-12">
                <div className="text-center lg:col-span-6 lg:text-left space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-navy-50/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-navy-800 border border-navy-100">
                    <Heart className="h-3.5 w-3.5 text-navy-600 fill-navy-600" />
                    Dedicated Clinical Excellence
                  </div>
                  <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                    <DepthParallaxWords delay={100} stagger={65}>
                      {heroTitle}
                    </DepthParallaxWords>
                  </h1>
                  <p className="mx-auto mt-4 max-w-xl text-base lg:text-lg leading-relaxed text-slate-600 lg:mx-0">
                    <DepthParallaxWords delay={350} stagger={25}>
                      {heroSub}
                    </DepthParallaxWords>
                  </p>
                  <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                    <button
                      onClick={() => changeTab("doctors")}
                      className="blob-btn blob-btn--reverse w-full sm:w-auto"
                    >
                      <span className="relative z-10 inline-flex items-center gap-2">
                        Book Appointment Online
                        <ArrowRight className="h-5 w-5" />
                      </span>
                      <span className="blob-btn__inner">
                        <span className="blob-btn__blobs">
                          <span className="blob-btn__blob"></span>
                          <span className="blob-btn__blob"></span>
                          <span className="blob-btn__blob"></span>
                          <span className="blob-btn__blob"></span>
                        </span>
                      </span>
                    </button>
                  </div>

                  <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs lg:text-sm font-semibold text-slate-500 lg:justify-start">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" /> 24/7 Trauma Care
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Verified Medical Staff
                    </div>
                  </div>
                </div>

                {/* Hero Banner / 3D Clinical Illustration */}
                <div className="lg:col-span-6">
                  {heroBannerUrl ? (
                    <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-2xl">
                      <img src={heroBannerUrl} alt={hospitalName} className="w-full aspect-[4/3] object-cover" />
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-3 shadow-2xl group">
                      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-navy-900 via-slate-900 to-navy-950 aspect-[4/3] flex items-center justify-center">
                        <img
                          src="/3d_doctors.png"
                          alt="3D Doctors Illustration"
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-4 right-4 rounded-full bg-emerald-500/20 backdrop-blur-md px-3.5 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 shadow-sm">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          24/7 OPEN
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-xl p-3 border border-white/40 shadow-lg flex justify-between items-center text-navy-900">
                          <div>
                            <h4 className="text-xs font-extrabold">{hospitalName}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold">Specialized OPD & Trauma Center</p>
                          </div>
                          <button
                            onClick={() => changeTab("doctors")}
                            className="rounded-lg bg-navy-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-navy-800 transition-colors"
                          >
                            View Doctors
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Short Hospital Introduction */}
            <section className="bg-white py-16 border-y border-slate-200">
              <div className="mx-auto max-w-4xl px-6 text-center space-y-6">
                <span className="text-xs font-bold uppercase tracking-wider text-navy-700">Introduction</span>
                <h2 className="text-3xl font-extrabold text-slate-900">
                  <DepthParallaxWords delay={150} stagger={60}>
                    {`Welcome to ${hospitalName}`}
                  </DepthParallaxWords>
                </h2>
                <p className="text-base leading-relaxed text-slate-650 font-medium">
                  <DepthParallaxWords delay={150} stagger={18}>
                    {aboutText}
                  </DepthParallaxWords>
                </p>
              </div>
            </section>

            {/* Why Choose Our Hospital */}
            <section className="py-20 px-6 lg:px-12 bg-slate-50">
              <div className="mx-auto max-w-[1600px]">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-700">Our Strengths</span>
                  <h2 className="text-3xl font-extrabold text-slate-900">
                    <DepthParallaxWords delay={100} stagger={60}>
                      Why Patients Trust Us
                    </DepthParallaxWords>
                  </h2>
                  <p className="text-slate-600 text-sm">
                    <DepthParallaxWords delay={180} stagger={22}>
                      We provide an array of inpatient and outpatient patient support services to ensure absolute recovery.
                    </DepthParallaxWords>
                  </p>
                </div>

                <div className="mt-14">
                  <AnimatedList
                    items={whyChooseUs.slice(0, 4).map((item, idx) => {
                      const icons = [<Heart className="h-5 w-5" />, <Shield className="h-5 w-5" />, <Clock3 className="h-5 w-5" />, <Award className="h-5 w-5" />];
                      const colors = ["#0505a9", "#0505a9", "#0505a9", "#0505a9"];
                      const badges = ["Compassion", "Certified", "24/7 OPD", "Top Rated"];
                      return {
                        id: `trust-card-${idx}`,
                        title: item.title,
                        description: item.desc,
                        icon: icons[idx] || <Heart className="h-5 w-5" />,
                        color: colors[idx] || "#0505a9",
                        badge: badges[idx] || "Verified",
                      };
                    })}
                  />
                </div>
              </div>
            </section>

            {/* Featured Departments */}
            <section className="py-20 px-6 lg:px-12 bg-white">
              <div className="mx-auto max-w-[1600px]">
                <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 pb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-navy-700">Clinical Specialties</span>
                    <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
                      <DepthParallaxWords delay={100} stagger={60}>
                        Featured Departments
                      </DepthParallaxWords>
                    </h2>
                  </div>
                  <button onClick={() => changeTab("departments")} className="mt-4 sm:mt-0 flex items-center gap-1 text-sm font-bold text-navy-700 hover:underline">
                    View All Departments <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                  {departments.slice(0, 3).map((dept, idx) => {
                    const deptIcons = [Activity, Heart, Stethoscope, Award];
                    const DeptIcon = deptIcons[idx % deptIcons.length];
                    return (
                      <div key={dept._id || idx} className="dept-slide-card">
                        {/* Slide 1: Header & Icon */}
                        <div className="slide slide1">
                          <div className="content">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-sm">
                              <DeptIcon className="h-5 w-5" />
                            </div>
                            <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                              {dept.category || "Specialty"}
                            </span>
                            <h3 className="text-lg font-extrabold text-white">{dept.name}</h3>
                          </div>
                        </div>

                        {/* Slide 2: Details & Fees */}
                        <div className="slide slide2">
                          <div className="content">
                            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed text-center">
                              {dept.description || "Comprehensive clinical management and therapy services delivered by board-certified practitioners."}
                            </p>
                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
                              <span>Floor: <strong className="text-slate-700">{dept.floor || "Ground"}</strong></span>
                              <span className="font-extrabold text-[#0505a9]">OPD Fee: ₹{dept.consultationFee || 300}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {departments.length === 0 && (
                    <div className="col-span-3 text-center py-10 text-slate-400 text-xs">
                      No departments configured yet. They will appear dynamically once added in the Admin Dashboard.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Featured Services */}
            <section className="py-20 px-6 lg:px-12 bg-slate-50">
              <div className="mx-auto max-w-[1600px]">
                <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 pb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-navy-700">Treatment Catalog</span>
                    <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
                      <DepthParallaxWords delay={100} stagger={60}>
                        Featured Hospital Services
                      </DepthParallaxWords>
                    </h2>
                  </div>
                  <button onClick={() => changeTab("services")} className="mt-4 sm:mt-0 flex items-center gap-1 text-sm font-bold text-navy-700 hover:underline">
                    View All Services <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {dynamicServices.slice(0, 8).map((s, idx) => (
                    <div key={idx} className="tile-grid-card flex flex-col justify-between">
                      <div className="relative z-10 space-y-1">
                        <h4 className="text-sm font-bold text-slate-850">
                          <DepthParallaxWords delay={80} stagger={25}>
                            {s.service}
                          </DepthParallaxWords>
                        </h4>
                        <span className="block text-[10px] text-navy-700 font-bold uppercase tracking-wider">
                          <DepthParallaxWords delay={150} stagger={25}>
                            {s.deptName}
                          </DepthParallaxWords>
                        </span>
                      </div>

                      {/* Conic Shine & Background Grid Tiles Effect */}
                      <div className="shine"></div>
                      <div className="background">
                        <div className="tiles">
                          <div className="tile tile-1"></div>
                          <div className="tile tile-2"></div>
                          <div className="tile tile-3"></div>
                          <div className="tile tile-4"></div>
                          <div className="tile tile-5"></div>
                          <div className="tile tile-6"></div>
                          <div className="tile tile-7"></div>
                          <div className="tile tile-8"></div>
                          <div className="tile tile-9"></div>
                          <div className="tile tile-10"></div>
                        </div>
                        <div className="line line-1"></div>
                        <div className="line line-2"></div>
                        <div className="line line-3"></div>
                      </div>
                    </div>
                  ))}
                  {dynamicServices.length === 0 && (
                    <div className="col-span-4 text-center py-10 text-slate-400 text-xs">
                      No services compiled yet. Services are derived dynamically from department clinical tags.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Book Appointment CTA Banner */}
            <section className="py-16 px-6 lg:px-12 bg-white">
              <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-navy-800 to-navy-900 px-8 py-12 text-center text-white shadow-xl relative overflow-hidden sm:px-16">
                <div className="absolute top-0 right-0 h-40 w-40 bg-navy-700/30 rounded-full blur-2xl pointer-events-none" />
                <div className="relative space-y-6">
                  <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    <DepthParallaxWords delay={100} stagger={60}>
                      Need to Consult a Specialist?
                    </DepthParallaxWords>
                  </h2>
                  <p className="mx-auto max-w-xl text-sm leading-relaxed text-navy-150">
                    <DepthParallaxWords delay={180} stagger={20}>
                      Secure an outpatient OPD consultation token online. Avoid waiting times and connect with our licensed attending practitioners immediately.
                    </DepthParallaxWords>
                  </p>
                  <div className="flex justify-center pt-6">
                    <button
                      onClick={(e) => {
                        animateBubblyButton(e, () => changeTab("doctors"));
                      }}
                      className="animated-green-dash-btn group cursor-pointer"
                    >
                      <svg
                        className="animated-green-dash-svg"
                        width="100%"
                        height="100%"
                        viewBox="0 0 320 64"
                        preserveAspectRatio="none"
                      >
                        <rect
                          className="svg-btn-line svg-btn-line--outer"
                          strokeWidth="6"
                          stroke="#10b981"
                          strokeLinecap="round"
                          fill="none"
                          x="3"
                          y="3"
                          width="314"
                          height="58"
                          rx="29"
                        />
                        <rect
                          className="svg-btn-line svg-btn-line--inner"
                          strokeWidth="3"
                          stroke="#059669"
                          strokeLinecap="round"
                          fill="none"
                          x="3"
                          y="3"
                          width="314"
                          height="58"
                          rx="29"
                        />
                      </svg>
                      <span className="relative z-10 flex items-center gap-2 font-black text-[#059669] text-sm tracking-wider">
                        BOOK ONLINE OPD APPOINTMENT <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-[#059669]" />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Preview & Business Hours */}
            <section className="py-16 px-6 lg:px-12 bg-slate-50 border-t border-slate-200">
              <div className="mx-auto max-w-[1600px] grid grid-cols-1 gap-12 lg:grid-cols-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="inline-flex rounded-xl bg-navy-50 p-2.5 text-navy-700"><MapPin className="h-5 w-5" /></div>
                  <h3 className="text-base font-bold text-slate-800">
                    <DepthParallaxWords delay={80} stagger={30}>Our Location</DepthParallaxWords>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <DepthParallaxWords delay={150} stagger={15}>{address}</DepthParallaxWords>
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="inline-flex rounded-xl bg-navy-50 p-2.5 text-navy-700"><Phone className="h-5 w-5" /></div>
                  <h3 className="text-base font-bold text-slate-800">
                    <DepthParallaxWords delay={80} stagger={30}>Contact Details</DepthParallaxWords>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <DepthParallaxWords delay={150} stagger={15}>{`Phone: ${phone} | Email: ${email}`}</DepthParallaxWords>
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="inline-flex rounded-xl bg-navy-50 p-2.5 text-navy-700"><Clock className="h-5 w-5" /></div>
                  <h3 className="text-base font-bold text-slate-800">
                    <DepthParallaxWords delay={80} stagger={30}>Clinical Hours</DepthParallaxWords>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <DepthParallaxWords delay={150} stagger={15}>{workingHours}</DepthParallaxWords>
                  </p>
                </div>
              </div>
            </section>

            {/* FAQ & Contact Form Section (Side-by-Side) */}
            <section id="faqs-section" className="py-20 px-6 lg:px-12 bg-slate-50/70 border-t border-slate-200">
              <div className="mx-auto max-w-[1600px]">
                <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
                  <div className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3.5 py-1.5 text-xs font-bold text-navy-700 border border-navy-100">
                    <HelpCircle className="h-4 w-4 text-navy-600" />
                    <span>PATIENT HELP DESK & INQUIRIES</span>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                    <DepthParallaxWords delay={100} stagger={60}>
                      Frequently Asked Questions
                    </DepthParallaxWords>
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    <DepthParallaxWords delay={180} stagger={18}>
                      Find quick answers to common patient queries about appointments, departments, and clinical services.
                    </DepthParallaxWords>
                  </p>
                </div>

                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-6">
                    <h3 className="text-xl font-extrabold text-slate-900">Common Patient Questions</h3>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">{displayFaqs.length} FAQs</span>
                  </div>

                  {displayFaqs.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 font-medium text-sm shadow-sm">
                      No FAQs have been published for this hospital yet.
                    </div>
                  ) : (
                    <MotionAccordion
                      items={displayFaqs.map((faq: any) => ({
                        question: faq.q,
                        answer: faq.a,
                      }))}
                      gap={12}
                      defaultOpenIndex={0}
                    />
                  )}
                </div>
              </div>
            </section>

          </div>
        )}

        {/* --- VIEW: ABOUT US --- */}
        {activeTab === "about" && (
          <div className="transition-all duration-300 ease-in-out py-16 px-6 lg:px-12 bg-white">
            <div className="mx-auto max-w-4xl space-y-16">

              <div className="text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-navy-700">
                  <DepthParallaxWords delay={60} stagger={30}>Our Institution</DepthParallaxWords>
                </span>
                <h1 className="text-4xl font-extrabold text-slate-900">
                  <DepthParallaxWords delay={100} stagger={60}>About Our Hospital</DepthParallaxWords>
                </h1>
                <p className="text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
                  <DepthParallaxWords delay={180} stagger={18}>
                    Learn about our clinical legacy, our patient healthcare policies, and the guiding core values driving our medical teams.
                  </DepthParallaxWords>
                </p>
              </div>

              {/* Hospital Overview */}
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 space-y-4 shadow-xs">
                <h3 className="text-xl font-extrabold text-slate-900">
                  <DepthParallaxWords delay={80} stagger={30}>Hospital Overview</DepthParallaxWords>
                </h3>
                <p className="text-sm leading-relaxed text-slate-650 font-medium">
                  {aboutText}
                </p>
              </div>

              {/* Mission/Vision/Values Deck */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {/* Our Mission */}
                <article className="smooth-about-card group">
                  <div className="card__img-wrapper">
                    <div className="card__info-hover">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-navy-700 bg-navy-50/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-navy-100">
                        Pillar 01
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-navy-700 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs">
                        <Clock3 className="h-3.5 w-3.5 text-navy-600" />
                        <span>24/7 OPD</span>
                      </div>
                    </div>
                    <div
                      className="card__img--hover"
                      style={{
                        backgroundImage:
                          "url('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80')",
                      }}
                    />
                  </div>
                  <div className="card__info">
                    <span className="card__category">Clinical Care</span>
                    <h3 className="card__title text-lg font-black text-slate-900">
                      <DepthParallaxWords delay={80} stagger={30}>Our Mission</DepthParallaxWords>
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600 font-medium">
                      {missionText}
                    </p>
                  </div>
                </article>

                {/* Our Vision */}
                <article className="smooth-about-card group">
                  <div className="card__img-wrapper">
                    <div className="card__info-hover">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-navy-700 bg-navy-50/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-navy-100">
                        Pillar 02
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-navy-700 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs">
                        <Award className="h-3.5 w-3.5 text-navy-600" />
                        <span>Certified</span>
                      </div>
                    </div>
                    <div
                      className="card__img--hover"
                      style={{
                        backgroundImage:
                          "url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80')",
                      }}
                    />
                  </div>
                  <div className="card__info">
                    <span className="card__category">Innovation</span>
                    <h3 className="card__title text-lg font-black text-slate-900">
                      <DepthParallaxWords delay={80} stagger={30}>Our Vision</DepthParallaxWords>
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600 font-medium">
                      {visionText}
                    </p>
                  </div>
                </article>

                {/* Our Values */}
                <article className="smooth-about-card group">
                  <div className="card__img-wrapper">
                    <div className="card__info-hover">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-navy-700 bg-navy-50/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-navy-100">
                        Pillar 03
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs">
                        <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                        <span>Patient First</span>
                      </div>
                    </div>
                    <div
                      className="card__img--hover"
                      style={{
                        backgroundImage:
                          "url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80')",
                      }}
                    />
                  </div>
                  <div className="card__info">
                    <span className="card__category">Integrity</span>
                    <h3 className="card__title text-lg font-black text-slate-900">
                      <DepthParallaxWords delay={80} stagger={30}>Our Values</DepthParallaxWords>
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600 font-medium">
                      {valuesText}
                    </p>
                  </div>
                </article>
              </div>

              {/* FAQs accordion */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 border-b pb-3">Frequently Asked Questions</h2>
                {faqs.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 font-medium text-sm shadow-sm">
                    No FAQs have been published for this hospital yet.
                  </div>
                ) : (
                  <MotionAccordion
                    items={faqs.map((faq: any) => ({
                      question: faq.q,
                      answer: faq.a,
                    }))}
                    gap={12}
                    defaultOpenIndex={0}
                  />
                )}
              </div>

            </div>
          </div>
        )}

        {/* --- VIEW: DEPARTMENTS --- */}
        {activeTab === "departments" && (
          <div className="transition-all duration-300 ease-in-out py-16 px-6 lg:px-12 bg-white">
            <div className="mx-auto max-w-[1600px] space-y-12">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-navy-700">
                  <DepthParallaxWords delay={60} stagger={30}>Clinical Specialties</DepthParallaxWords>
                </span>
                <h1 className="text-4xl font-extrabold text-slate-900">
                  <DepthParallaxWords delay={100} stagger={60}>Medical Departments</DepthParallaxWords>
                </h1>
                <p className="text-slate-600 text-sm max-w-md mx-auto">
                  <DepthParallaxWords delay={180} stagger={18}>
                    Discover our active clinical branches, operating wards, head doctors, and specialized consulting fees.
                  </DepthParallaxWords>
                </p>
              </div>

              {/* Departments Grid with Tilt Card Effect */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {departments.map((dept) => (
                  <DepartmentTiltCard
                    key={dept._id}
                    title={dept.name}
                    category={dept.category || "Specialty"}
                    specialization={dept.specialization || "General Medicine"}
                    description={dept.description || "Our department provides comprehensive clinical checks and consulting services under experienced medical supervisors."}
                    headName={dept.headName}
                    location={dept.building ? `${dept.building}, Fl ${dept.floor || 1}` : "Main Building"}
                    fee={dept.consultationFee || 300}
                    isEmergency={dept.isEmergency}
                  />
                ))}

                {departments.length === 0 && (
                  <div className="col-span-3 text-center py-20 text-slate-400 text-xs">
                    No active departments found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: DOCTORS --- */}
        {activeTab === "doctors" && (
          <div className="transition-all duration-300 ease-in-out py-16 px-6 lg:px-12 bg-white">
            <div className="mx-auto max-w-[1600px] space-y-10">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-navy-700">
                  <DepthParallaxWords delay={60} stagger={30}>Clinical Practitioners</DepthParallaxWords>
                </span>
                <h1 className="text-4xl font-extrabold text-slate-900">
                  <DepthParallaxWords delay={100} stagger={60}>Meet Our Specialist Doctors</DepthParallaxWords>
                </h1>
                <p className="text-slate-600 text-sm max-w-md mx-auto">
                  <DepthParallaxWords delay={180} stagger={18}>
                    Find expert doctors across key medical departments and schedule online OPD consultations directly.
                  </DepthParallaxWords>
                </p>
              </div>

              {/* Search & Branch & Specialization Filter Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-xs">
                {/* Search Input */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={doctorSearchQuery}
                    onChange={(e) => setDoctorSearchQuery(e.target.value)}
                    placeholder="Search doctor by name or specialization..."
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-navy-600 focus:ring-1 focus:ring-navy-600 focus:outline-none shadow-xs transition-all"
                  />
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Branch Selector Dropdown */}
                  {branches.length > 0 && (
                    <div className="relative w-full sm:w-56">
                      <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 focus:border-navy-600 focus:ring-1 focus:ring-navy-600 focus:outline-none shadow-xs cursor-pointer transition-all"
                      >
                        <option value="all">All Hospital Branches</option>
                        {branches.map((b: any) => (
                          <option key={b._id || b.id} value={b._id || b.id}>
                            {b.name} {b.city ? `(${b.city})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Specialization Selector Dropdown */}
                  <div className="relative w-full sm:w-56">
                    <select
                      value={selectedSpecialization}
                      onChange={(e) => setSelectedSpecialization(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 focus:border-navy-600 focus:ring-1 focus:ring-navy-600 focus:outline-none shadow-xs cursor-pointer capitalize transition-all"
                    >
                      <option value="all">All Specializations</option>
                      {doctorSpecializations.map((spec: string) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Doctors Grid */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {catalogDoctors.map((doc: any) => {
                  const docName = doc.name || (typeof doc.user === "object" ? doc.user?.name : doc.user) || "Dr. Specialist";
                  const photo = doc.photoUrl || (typeof doc.user === "object" ? doc.user?.avatarUrl : null);
                  const deptName = typeof doc.department === "object" && doc.department ? doc.department.name : (doc.department || "General Medicine");
                  const specName = doc.specialization || deptName;
                  const qualText = doc.qualifications || doc.qualification || "MD, MBBS";
                  const fee = String((doc.consultationSettings as any)?.fee || doc.consultationFee || doc.fee || 500).replace(/[^0-9]/g, "") || "500";
                  const branchName = typeof doc.branch === "object" && doc.branch ? doc.branch.name : (doc.branch || null);

                  return (
                    <div key={doc._id || doc.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:border-navy-200 transition-all hover:shadow-md">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          {photo ? (
                            <img src={photo} alt={docName} className="h-16 w-16 rounded-full object-cover border border-slate-200 shadow-sm transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-700 font-bold border border-navy-100 shadow-sm text-xl transition-transform duration-300 group-hover:scale-105">
                              {docName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="inline-block rounded-full bg-navy-50 px-2.5 py-0.5 text-[9px] font-bold text-navy-700 uppercase transition-colors duration-300 group-hover:bg-navy-100">
                              {deptName}
                            </span>
                            <h3 className="text-lg font-bold text-slate-850 mt-1 transition-colors duration-300 group-hover:text-navy-900">Dr. {docName.replace(/^dr\.\s*/i, "")}</h3>
                            <span className="block text-xs font-semibold text-slate-500">{specName}</span>
                          </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="space-y-2 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Qualifications:</span>
                            <span className="font-bold text-slate-700">{qualText}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Department:</span>
                            <span className="font-bold text-slate-700">{deptName}</span>
                          </div>
                          {branchName && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Branch Location:</span>
                              <span className="font-bold text-navy-700 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-navy-600 shrink-0" />
                                {branchName}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-400">OPD Consultation Fee:</span>
                            <span className="font-bold text-navy-700 text-sm">₹{fee}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 mt-6">
                        <Link
                          to={`/doctors/${doc._id || doc.id}`}
                          className="skew-cta-btn group/cta"
                        >
                          <span className="cta-text">
                            <Calendar className="h-4 w-4" />
                            <span>Book Appointment</span>
                          </span>
                          <span className="cta-arrow">
                            <svg width="42px" height="24px" viewBox="0 0 66 43" version="1.1" xmlns="http://www.w3.org/2000/svg">
                              <g id="arrow" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                                <path className="one" d="M40.1543933,3.89485454 L43.9763149,0.139296592 C44.1708311,-0.0518420739 44.4826329,-0.0518571125 44.6771675,0.139262789 L65.6916134,20.7848311 C66.0855801,21.1718824 66.0911863,21.8050225 65.704135,22.1989893 C65.7000188,22.2031791 65.6958657,22.2073326 65.6916762,22.2114492 L44.677098,42.8607841 C44.4825957,43.0519059 44.1708242,43.0519358 43.9762853,42.8608513 L40.1545186,39.1069479 C39.9575152,38.9134427 39.9546793,38.5968729 40.1481845,38.3998695 C40.1502893,38.3977268 40.1524132,38.395603 40.1545562,38.3934985 L56.9937789,21.8567812 C57.1908028,21.6632968 57.193672,21.3467273 57.0001876,21.1497035 C56.9980647,21.1475418 56.9959223,21.1453995 56.9937605,21.1432767 L40.1545208,4.60825197 C39.9574869,4.41477773 39.9546013,4.09820839 40.1480756,3.90117456 C40.1501626,3.89904911 40.1522686,3.89694235 40.1543933,3.89485454 Z" fill="#FFFFFF"></path>
                                <path className="two" d="M20.1543933,3.89485454 L23.9763149,0.139296592 C24.1708311,-0.0518420739 24.4826329,-0.0518571125 24.6771675,0.139262789 L45.6916134,20.7848311 C46.0855801,21.1718824 46.0911863,21.8050225 45.704135,22.1989893 C45.7000188,22.2031791 45.6958657,22.2073326 45.6916762,22.2114492 L24.677098,42.8607841 C24.4825957,43.0519059 24.1708242,43.0519358 23.9762853,42.8608513 L20.1545186,39.1069479 C19.9575152,38.9134427 19.9546793,38.5968729 20.1481845,38.3998695 C20.1502893,38.3977268 20.1524132,38.395603 20.1545562,38.3934985 L36.9937789,21.8567812 C37.1908028,21.6632968 37.193672,21.3467273 37.0001876,21.1497035 C37.6980647,21.1475418 37.6959223,21.1453995 36.9937605,21.1432767 L20.1545208,4.60825197 C19.9574869,4.41477773 19.9546013,4.09820839 20.1480756,3.90117456 C20.1501626,3.89904911 20.1522686,3.89694235 20.1543933,3.89485454 Z" fill="#FFFFFF"></path>
                                <path className="three" d="M0.154393339,3.89485454 L3.97631488,0.139296592 C4.17083111,-0.0518420739 4.48263286,-0.0518571125 4.67716753,0.139262789 L25.6916134,20.7848311 C26.0855801,21.1718824 26.0911863,21.8050225 25.704135,22.1989893 C25.7000188,22.2031791 25.6958657,22.2073326 25.6916762,22.2114492 L4.67709797,42.8607841 C4.48259567,43.0519059 4.17082418,43.0519358 3.97628526,42.8608513 L0.154518591,39.1069479 C-0.0424848215,38.9134427 -0.0453206733,38.5968729 0.148184538,38.3998695 C0.150289256,38.3977268 0.152413239,38.395603 0.154556228,38.3934985 L16.9937789,21.8567812 C17.1908028,21.6632968 17.193672,21.3467273 17.0001876,21.1497035 C16.9980647,21.1475418 16.9959223,21.1453995 16.9937605,21.1432767 L0.15452076,4.60825197 C-0.0425130651,4.41477773 -0.0453986756,4.09820839 0.148075568,3.90117456 C0.150162624,3.89904911 0.152268631,3.89694235 0.154393339,3.89485454 Z" fill="#FFFFFF"></path>
                              </g>
                            </svg>
                          </span>
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {catalogDoctors.length === 0 && (
                  <div className="col-span-3 text-center py-20 text-slate-400 text-xs">
                    No doctors match the selected specialization or search filter.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* --- VIEW: SERVICES --- */}
        {activeTab === "services" && (
          <div className="transition-all duration-300 ease-in-out py-16 px-6 lg:px-12 bg-white">
            <div className="mx-auto max-w-[1600px] space-y-12">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-navy-700">
                  <DepthParallaxWords delay={60} stagger={30}>Clinical Catalog</DepthParallaxWords>
                </span>
                <h1 className="text-4xl font-extrabold text-slate-900">
                  <DepthParallaxWords delay={100} stagger={60}>Services Offered</DepthParallaxWords>
                </h1>
                <p className="text-slate-600 text-sm max-w-md mx-auto">
                  <DepthParallaxWords delay={180} stagger={18}>
                    A comprehensive listing of diagnostic and clinical services aggregated dynamically from our operating specialties.
                  </DepthParallaxWords>
                </p>
              </div>

              {/* Grouped Services with Glow Cursor Spotlight Effect */}
              {serviceHoverItems.length > 0 ? (
                <GlowHover
                  className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                  items={serviceHoverItems}
                  maskSize={450}
                  glowIntensity={0.12}
                />
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs">
                  No services have been defined in clinical department configurations.
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- VIEW: BLOG --- */}
        {activeTab === "blog" && (
          <div className="transition-all duration-300 ease-in-out py-16 px-6 lg:px-12 bg-white">
            <div className="mx-auto max-w-[1600px] space-y-12">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-navy-700">
                  <DepthParallaxWords delay={60} stagger={30}>Health & Clinical Insights</DepthParallaxWords>
                </span>
                <h1 className="text-4xl font-extrabold text-slate-900">
                  <DepthParallaxWords delay={100} stagger={60}>Hospital News & Articles</DepthParallaxWords>
                </h1>
                <p className="text-slate-600 text-sm max-w-md mx-auto">
                  <DepthParallaxWords delay={180} stagger={18}>
                    Stay informed with health recommendations, medical breakthroughs, and operational updates from our practitioners.
                  </DepthParallaxWords>
                </p>
              </div>

              {/* Blog Feed Grid */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {publicBlogs.map((post) => (
                  <div
                    key={post._id}
                    onClick={() => setSelectedBlogModal(post)}
                    className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-md hover:border-navy-200 transition-all group"
                  >
                    {post.coverImageUrl ? (
                      <img src={post.coverImageUrl} alt={post.title} className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="h-48 w-full bg-slate-100 flex items-center justify-center text-slate-300">
                        <FileText className="h-12 w-12" />
                      </div>
                    )}

                    <div className="p-6 space-y-3 flex-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 uppercase">
                        <span>{post.author || "Hospital Admin"}</span>
                        <span>{new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-850 group-hover:text-navy-700 transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>

                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {post.tags.map((t, idx) => (
                            <span key={idx} className="text-[10px] font-bold bg-navy-50 text-navy-700 rounded px-2 py-0.5">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="px-6 pb-6 pt-2 flex items-center gap-1 text-xs font-bold text-navy-700 group-hover:underline">
                      Read Full Article <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}

                {publicBlogs.length === 0 && (
                  <div className="col-span-3 text-center py-20 text-slate-400 text-xs">
                    No articles published yet. New articles will appear here as soon as they are added in the Admin Dashboard.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {/* --- VIEW: CONTACT US --- */}
        {activeTab === "contact" && (
          <div className="transition-all duration-300 ease-in-out py-16 px-6 lg:px-12">
            <div className="mx-auto max-w-[1600px] grid grid-cols-1 gap-12 lg:grid-cols-12">

              {/* Contact info */}
              <div className="lg:col-span-5 space-y-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-700">
                    <DepthParallaxWords delay={60} stagger={30}>Contact Us</DepthParallaxWords>
                  </span>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                    <DepthParallaxWords delay={100} stagger={60}>Get in Touch</DepthParallaxWords>
                  </h1>
                  <p className="mt-4 text-slate-655 text-sm">
                    <DepthParallaxWords delay={180} stagger={18}>
                      Have any operational queries, general concerns, or booking assistance requests? Contact us directly and our medical desk will coordinate with you.
                    </DepthParallaxWords>
                  </p>
                </div>

                <div className="space-y-4 text-xs font-medium text-slate-750">
                  <div className="flex gap-4 items-center">
                    <div className="rounded-lg bg-navy-50 p-2.5 text-navy-700"><Mail className="h-5 w-5" /></div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Email Address</span>
                      <a href={`mailto:${email}`} className="font-bold hover:underline text-slate-800">{email}</a>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="rounded-lg bg-navy-50 p-2.5 text-navy-700"><Phone className="h-5 w-5" /></div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Phone Number</span>
                      <span className="font-bold text-slate-800">{phone}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="rounded-lg bg-navy-50 p-2.5 text-navy-700"><MapPin className="h-5 w-5" /></div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Address</span>
                      <span className="font-bold text-slate-800">{address}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="rounded-lg bg-navy-50 p-2.5 text-navy-700"><Clock className="h-5 w-5" /></div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Working Hours</span>
                      <span className="font-bold text-slate-800">{workingHours}</span>
                    </div>
                  </div>
                </div>

                {/* Google Maps Iframe */}
                <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm">
                  <iframe
                    src={embedMapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    title={`${hospitalName} Location Map`}
                  />
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
                {contactSubmitted ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850">Enquiry Received</h3>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Thank you. Your message has been saved in our enquiries registry. The hospital admin team will respond to your email.
                    </p>
                    <button onClick={() => setContactSubmitted(false)} className="text-xs font-bold text-navy-700 hover:underline">
                      Send Another Enquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4 text-xs font-medium text-slate-700">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block mb-1">Your Full Name <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                          placeholder="Rahul Sharma"
                        />
                      </div>
                      <div>
                        <label className="block mb-1">Your Email <span className="text-rose-500">*</span></label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1">Subject <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                        placeholder="e.g. Consultation query, medical records request"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Your Message <span className="text-rose-500">*</span></label>
                      <textarea
                        rows={5}
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                        placeholder="Write your message here..."
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full py-3 bg-navy-700 transition-all duration-300 hover:bg-navy-800"
                      disabled={enquiryMutation.isPending}
                    >
                      {enquiryMutation.isPending ? "Sending Enquiry..." : "Send Contact Message"}
                    </Button>
                  </form>
                )}
              </div>

            </div>
          </div>
        )}

        {/* --- VIEW: PRIVACY POLICY --- */}
        {activeTab === "privacy" && (
          <div className="transition-all duration-300 ease-in-out py-16 px-6 lg:px-12 max-w-3xl mx-auto space-y-6 bg-white rounded-2xl shadow-sm border border-slate-200 mt-8 mb-16">
            <h1 className="text-3xl font-extrabold text-slate-900 border-b pb-4">Privacy Policy</h1>
            <p className="text-xs text-slate-500">Effective Date: July 23, 2026</p>
            <div className="text-sm leading-relaxed text-slate-655 space-y-4">
              <p>
                At {hospitalName}, we take patient and clinical data privacy with absolute seriousness. This Privacy Policy details how we govern data structures in our Hospital Management System software.
              </p>
              <h3 className="text-base font-bold text-slate-800 pt-4">1. Patient Medical Isolation</h3>
              <p>
                All data ingested in our platform (such as outpatient consults, medical history ledgers, and laboratory reports) is fully isolated per-hospital tenant. No clinical data is shared across different hospital domains unless explicit referrals are initiated by users.
              </p>
              <h3 className="text-base font-bold text-slate-800 pt-4">2. Audit Logging</h3>
              <p>
                Every write, update, and request action made by users is logged to our backend secure database to prevent unauthorized actions and comply with standard clinical safety mandates.
              </p>
            </div>
          </div>
        )}

        {/* --- VIEW: TERMS & CONDITIONS --- */}
        {activeTab === "terms" && (
          <div className="transition-all duration-300 ease-in-out py-16 px-6 lg:px-12 max-w-3xl mx-auto space-y-6 bg-white rounded-2xl shadow-sm border border-slate-200 mt-8 mb-16">
            <h1 className="text-3xl font-extrabold text-slate-900 border-b pb-4">Terms & Conditions</h1>
            <p className="text-xs text-slate-500">Effective Date: July 23, 2026</p>
            <div className="text-sm leading-relaxed text-slate-655 space-y-4">
              <p>
                Welcome to {hospitalName}. By utilizing our platform, you agree to comply with our compliance policies and terms of usage.
              </p>
              <h3 className="text-base font-bold text-slate-800 pt-4">1. Licensing & Subscription</h3>
              <p>
                We grant registered health systems a non-transferable, role-scoped subscription license to operate our cloud dashboards.
              </p>
              <h3 className="text-base font-bold text-slate-800 pt-4">2. User Responsibility</h3>
              <p>
                It is the responsibility of the hospital administrators to manage local user credentials, enforce password policies, and ensure clinical practitioners respect patient-record confidentiality.
              </p>
            </div>
          </div>
        )}

        {/* --- VIEW: COOKIE POLICY --- */}
        {activeTab === "cookie" && (
          <div className="transition-all duration-300 ease-in-out py-16 px-6 lg:px-12 max-w-3xl mx-auto space-y-6 bg-white rounded-2xl shadow-sm border border-slate-200 mt-8 mb-16">
            <h1 className="text-3xl font-extrabold text-slate-900 border-b pb-4">Cookie Policy</h1>
            <p className="text-xs text-slate-500">Effective Date: July 23, 2026</p>
            <div className="text-sm leading-relaxed text-slate-655 space-y-4">
              <p>
                This policy outlines our usage of cookies and local storage tokens.
              </p>
              <h3 className="text-base font-bold text-slate-800 pt-4">1. Strictly Necessary Storage</h3>
              <p>
                Our application does not utilize invasive cookies. We store authenticated session tokens (`JWT`) strictly in the client's session storage. This is necessary to keep staff securely signed in while navigating dashboard modules.
              </p>
              <h3 className="text-base font-bold text-slate-800 pt-4">2. De-authorization</h3>
              <p>
                Signing out of the platform clears all session tokens immediately. No persistent tracking tokens are left on your local machine.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* --- PREMIUM FOOTER --- */}
      <footer className="border-t border-slate-200 bg-white px-6 py-12 lg:px-12">
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 items-start">
          <div className="space-y-4">
            <div
              onClick={() => changeTab("home")}
              className="flex cursor-pointer items-center gap-2.5 text-lg font-extrabold text-navy-900"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={hospitalName} className="h-7 w-7 rounded object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded bg-navy-700 text-white font-bold text-xs shadow-sm">
                  <Activity className="h-4 w-4" />
                </div>
              )}
              <span>{hospitalName}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 max-w-sm">
              {footerText}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] font-bold text-slate-400">
              <span>Patient Focused</span>
              <span>•</span>
              <span>24/7 OPD</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-455">
              <DepthParallaxWords delay={60} stagger={30}>Quick Links</DepthParallaxWords>
            </div>
            <ul className="mt-4 space-y-2.5 text-xs font-semibold text-slate-600">
              <li>
                <button onClick={() => changeTab("home")} className="hover:text-navy-700 text-left">
                  Hospital Home
                </button>
              </li>
              <li>
                <button onClick={() => changeTab("doctors")} className="hover:text-navy-700 text-left">
                  Book Appointment
                </button>
              </li>
              <li>
                <Link to="/login" className="hover:text-navy-700">
                  Staff Login Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Hospital Links */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-455">
              <DepthParallaxWords delay={60} stagger={30}>Hospital</DepthParallaxWords>
            </div>
            <ul className="mt-4 space-y-2.5 text-xs font-semibold text-slate-600">
              <li>
                <button onClick={() => changeTab("about")} className="hover:text-navy-700 text-left">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => changeTab("departments")} className="hover:text-navy-700 text-left">
                  Departments Directory
                </button>
              </li>
              <li>
                <button onClick={() => changeTab("doctors")} className="hover:text-navy-700 text-left">
                  Doctors Directory
                </button>
              </li>
              <li>
                <button onClick={() => changeTab("services")} className="hover:text-navy-700 text-left">
                  Clinical Services
                </button>
              </li>
              <li>
                <button onClick={() => changeTab("blog")} className="hover:text-navy-700 text-left">
                  Health Blog
                </button>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-455">
              <DepthParallaxWords delay={60} stagger={30}>Legal & Policies</DepthParallaxWords>
            </div>
            <ul className="mt-4 space-y-2.5 text-xs font-semibold text-slate-600">
              <li>
                <button onClick={() => changeTab("privacy")} className="hover:text-navy-700 text-left">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => changeTab("terms")} className="hover:text-navy-700 text-left">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => changeTab("cookie")} className="hover:text-navy-700 text-left">
                  Cookie Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Social Media Section with 3D Flip & Background Fill Effect */}
          <div className="col-span-1 min-w-[240px] -ml-2 sm:-ml-6 lg:-ml-8">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-4">
              <DepthParallaxWords delay={60} stagger={30}>Connect With Us</DepthParallaxWords>
            </div>
            <ul className="social-hover-list flex-nowrap">
              {socialLinks.facebook && (
                <li className="facebook-item">
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" title="Facebook">
                    <i className="fab fa-facebook-f icon"></i>
                  </a>
                </li>
              )}
              {socialLinks.twitter && (
                <li className="twitter-item">
                  <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" title="Twitter / X">
                    <i className="fab fa-twitter icon"></i>
                  </a>
                </li>
              )}
              {socialLinks.linkedin && (
                <li className="linkedin-item">
                  <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                    <i className="fab fa-linkedin-in icon"></i>
                  </a>
                </li>
              )}
              {socialLinks.youtube && (
                <li className="youtube-item">
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" title="YouTube">
                    <i className="fab fa-youtube icon"></i>
                  </a>
                </li>
              )}
              {socialLinks.instagram && (
                <li className="instagram-item">
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">
                    <i className="fab fa-instagram icon"></i>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-[1600px] border-t border-slate-150 pt-6 text-center text-xs text-slate-455 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>© {new Date().getFullYear()} {hospitalName}. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-slate-500">Follow us on social media</span>
          </div>
        </div>
      </footer>

      {/* Blog Article Reader Modal */}
      {selectedBlogModal && (
        <Modal
          title={selectedBlogModal.title}
          isOpen={!!selectedBlogModal}
          onClose={() => setSelectedBlogModal(null)}
        >
          <div className="space-y-4 text-slate-700">
            {selectedBlogModal.coverImageUrl && (
              <img
                src={selectedBlogModal.coverImageUrl}
                alt={selectedBlogModal.title}
                className="w-full max-h-64 object-cover rounded-xl border border-slate-200"
              />
            )}
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-2">
              <span>Author: {selectedBlogModal.author}</span>
              <span>
                {new Date(selectedBlogModal.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="text-xs leading-relaxed space-y-3 whitespace-pre-line text-slate-650">
              {selectedBlogModal.content}
            </div>
            {selectedBlogModal.tags && selectedBlogModal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                {selectedBlogModal.tags.map((t, idx) => (
                  <span key={idx} className="text-[10px] font-bold bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Floating Action Button with Gooey Liquid Morph Popover */}
      <div className="fixed bottom-6 right-6 z-50">
        <GooeyPopover
          isOpen={isFloatingContactOpen}
          onOpenChange={setIsFloatingContactOpen}
          triggerSize={56}
          contentWidth={340}
          side="top"
          sideOffset={16}
          bgClassName="bg-white border border-slate-200 shadow-2xl text-slate-800"
          triggerBgClassName="bg-[#0505a9]"
          contentClassName="p-5"
          trigger={
            <div className="flex items-center justify-center w-full h-full text-white relative">
              <MessageSquare className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#0505a9]"></span>
              </span>
            </div>
          }
        >
          <div className="space-y-4 text-left">
            <div className="border-b border-slate-150 pb-3">
              <h4 className="text-base font-extrabold text-[#0505a9] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0505a9]" />
                <span>Send Contact Message</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Have a medical query? Leave us a message below.
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Rahul Sharma"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0505a9] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0505a9]/20 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0505a9] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0505a9]/20 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Your Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Write your message here..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0505a9] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0505a9]/20 transition-all resize-none shadow-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingContact || isSubmittedContact}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0505a9] hover:bg-[#040488] active:scale-[0.98] text-white font-extrabold text-xs shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isSubmittingContact ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Message...</span>
                    </div>
                  ) : isSubmittedContact ? (
                    <div className="flex items-center gap-1.5 text-white">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      <span>Sent Successfully!</span>
                    </div>
                  ) : (
                    <span>Send Message</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </GooeyPopover>
      </div>
    </div>
  );
}
