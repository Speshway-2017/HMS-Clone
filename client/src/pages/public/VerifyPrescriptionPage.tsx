import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, ShieldAlert, ArrowLeft, Building2, User, Stethoscope, Pill, ShieldCheck, HeartHandshake, Shield, Calendar, Activity } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

// Base API URL config matching client config
const API_URL = window.location.hostname === "localhost" ? "http://localhost:5000/api/v1" : "/api/v1";

interface VerifyPrescriptionData {
  prescriptionId: string;
  hospitalName: string;
  patientName: string;
  patientUhid: string;
  patientAge: number | null;
  patientGender: string;
  doctorName: string;
  doctorLicenseNo?: string;
  departmentName: string;
  visitDate: string;
  diagnosis: string;
  chiefComplaint: string;
  medications: Array<{
    name: string;
    strength?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
  labOrders: string[];
  radiologyOrders: string[];
  advice: string;
  followUpDate: string | null;
  status: string;
}

export function VerifyPrescriptionPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<VerifyPrescriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVerification() {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_URL}/prescriptions/${id}/verify`);
        setData(res.data.data);
      } catch (err: any) {
        console.error("Verification failed:", err);
        setError(err.response?.data?.message || "Invalid verification link or prescription ID.");
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchVerification();
    }
  }, [id]);

  useEffect(() => {
    document.title = data ? `${data.patientName} | Verified Prescription` : "Prescription Verification";
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
          <Activity className="absolute inset-0 m-auto h-5 w-5 text-navy-700 animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-500">Retrieving prescription verification telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md w-full p-8 text-center border-dashed border-red-200 bg-white shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -left-12 h-24 w-24 rounded-full bg-red-500/5 blur-xl" />
          <ShieldAlert className="mx-auto mb-5 h-14 w-14 text-red-500 animate-bounce" />
          <h2 className="text-xl font-extrabold text-slate-900">Verification Failure</h2>
          <p className="mt-3 text-xs text-slate-600 leading-relaxed">
            {error || "This specific clinical prescription code or reference is not registered in our records."}
          </p>
          <div className="border-t border-slate-100 my-6"></div>
          <button 
            onClick={() => window.location.href = "/"}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-700 hover:text-navy-850 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Hospital Portal
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 relative overflow-hidden">
      {/* Background medical grid patterns */}
      <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -left-32 bottom-20 h-80 w-80 rounded-full bg-navy-500/5 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-3xl space-y-6 relative z-10">
        
        {/* Verification Success Banner */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 to-teal-650 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 rounded-full blur-xl" />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20 shadow-inner">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-wider uppercase flex items-center gap-1.5">
                Prescription Verified
                <Shield className="h-4 w-4 text-emerald-350 fill-emerald-350/20" />
              </h1>
              <p className="text-xs text-white/90 font-semibold">
                This document is verified as an active, authentic clinical record.
              </p>
            </div>
          </div>
          <Badge tone="success" className="bg-white/20 border border-white/30 text-white font-bold py-1 px-3.5 rounded-full text-xs">
            VERIFIED SECURE
          </Badge>
        </div>

        {/* Prescription Metadata */}
        <Card className="p-8 bg-white border border-slate-200/80 shadow-xl space-y-6 rounded-2xl relative">
          
          {/* Hospital Row */}
          <div className="flex justify-between items-center border-b border-slate-150 pb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-navy-50 p-2 text-navy-700">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">{data.hospitalName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Prescription ID</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{data.prescriptionId}</span>
            </div>
          </div>

          {/* Patient / Doctor Info Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-700">
            {/* Patient column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-200 pb-2">
                <User className="h-4 w-4 text-navy-700" /> Patient Parameters
              </div>
              <div className="grid grid-cols-3 gap-y-2 text-slate-600 font-semibold">
                <span className="col-span-1 text-slate-450 uppercase text-[10px]">UHID:</span>
                <span className="col-span-2 font-mono font-bold text-slate-800">{data.patientUhid}</span>

                <span className="col-span-1 text-slate-450 uppercase text-[10px]">Full Name:</span>
                <span className="col-span-2 text-slate-800 font-extrabold">{data.patientName}</span>

                <span className="col-span-1 text-slate-450 uppercase text-[10px]">Age / Sex:</span>
                <span className="col-span-2 text-slate-850">
                  {data.patientAge !== null ? `${data.patientAge} Years` : "—"} / {data.patientGender}
                </span>
              </div>
            </div>

            {/* Doctor column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-200 pb-2">
                <Stethoscope className="h-4 w-4 text-navy-700" /> Attending Practitioner
              </div>
              <div className="grid grid-cols-3 gap-y-2 text-slate-600 font-semibold">
                <span className="col-span-1 text-slate-450 uppercase text-[10px]">Clinician:</span>
                <span className="col-span-2 text-slate-800 font-extrabold">Dr. {data.doctorName}</span>

                <span className="col-span-1 text-slate-450 uppercase text-[10px]">Department:</span>
                <span className="col-span-2 text-slate-850">{data.departmentName}</span>

                <span className="col-span-1 text-slate-450 uppercase text-[10px]">License Reg:</span>
                <span className="col-span-2 font-mono text-slate-850">{data.doctorLicenseNo || "—"}</span>
              </div>
            </div>
          </div>

          {/* Assessment & Complaints */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-800 border-b pb-2 uppercase tracking-wider">Clinical Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                <span className="block text-slate-400 uppercase text-[9px] mb-1.5">Chief Complaint</span>
                <span className="text-slate-800 font-extrabold text-sm">{data.chiefComplaint || "No primary complaints recorded."}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 col-span-2">
                <span className="block text-slate-400 uppercase text-[9px] mb-1.5">Diagnosis Summary</span>
                <span className="text-slate-800 font-extrabold text-sm leading-relaxed">{data.diagnosis}</span>
              </div>
            </div>
          </div>

          {/* Medications Table */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-850 border-b pb-2 flex items-center gap-2 uppercase tracking-wider">
              <Pill className="h-4 w-4 text-navy-700" /> Prescribed Medications (Rx Ledger)
            </h3>
            <div className="overflow-hidden border border-slate-200 rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-medium">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-650">
                      <th className="py-3 px-4">Medicine</th>
                      <th className="py-3 px-3">Strength</th>
                      <th className="py-3 px-3">Dosage</th>
                      <th className="py-3 px-3">Frequency</th>
                      <th className="py-3 px-3">Duration</th>
                      <th className="py-3 px-4">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {data.medications.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 px-4 text-center text-slate-450 italic font-semibold">
                          No prescription medication logs recorded.
                        </td>
                      </tr>
                    ) : (
                      data.medications.map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{med.name}</td>
                          <td className="py-3.5 px-3 font-semibold text-slate-800">{med.strength || "—"}</td>
                          <td className="py-3.5 px-3 text-slate-700">{med.dosage || "—"}</td>
                          <td className="py-3.5 px-3 text-slate-700">{med.frequency || "—"}</td>
                          <td className="py-3.5 px-3 text-slate-700">{med.duration || "—"}</td>
                          <td className="py-3.5 px-4 text-slate-500 font-semibold leading-relaxed">{med.instructions || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Diagnostics Orders */}
          {(data.labOrders.length > 0 || data.radiologyOrders.length > 0) && (
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-850 border-b pb-2 uppercase tracking-wider">Required Diagnostics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                {data.labOrders.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-2">
                    <span className="block text-slate-400 uppercase text-[9px]">Laboratory Investigations</span>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-850">
                      {data.labOrders.map((test, i) => <li key={i}>{test}</li>)}
                    </ul>
                  </div>
                )}
                {data.radiologyOrders.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-2">
                    <span className="block text-slate-400 uppercase text-[9px]">Radiology Modalities</span>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-850">
                      {data.radiologyOrders.map((rad, i) => <li key={i}>{rad}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Advice & Instructions */}
          {(data.advice || data.followUpDate) && (
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-855 border-b pb-2 uppercase tracking-wider">Clinical Instructions</h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50 space-y-3 text-xs font-semibold">
                {data.advice && (
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block mb-1">Attending Physician Advice</span>
                    <p className="text-slate-800 text-sm leading-relaxed">{data.advice}</p>
                  </div>
                )}
                {data.followUpDate && (
                  <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between">
                    <span className="text-slate-400 uppercase text-[9px] flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Recommended Revisit Schedule
                    </span>
                    <span className="font-extrabold text-teal-700 bg-teal-50 border border-teal-150 py-1 px-3 rounded-lg">
                      {new Date(data.followUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Secure watermark label */}
          <div className="border-t border-slate-150 pt-5 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-450 font-bold gap-3">
            <span className="flex items-center gap-1.5">
              <HeartHandshake className="h-4 w-4 text-navy-700" /> Digital Prescription Integrity Framework
            </span>
            <span className="bg-slate-100 py-1 px-2.5 rounded text-slate-500 font-mono">
              VERIFIED: {new Date(data.visitDate).toLocaleDateString("en-IN")}
            </span>
          </div>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <button 
            onClick={() => window.location.href = "/"}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Portal Home
          </button>
        </div>
      </div>
    </div>
  );
}
