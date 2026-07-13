import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, ShieldAlert, ArrowLeft, Building2, User, Stethoscope, Pill, ShieldCheck, HeartHandshake } from "lucide-react";
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

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Retrieving prescription verification data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full p-6 text-center border-dashed border-red-200 bg-white shadow-lg">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="text-lg font-bold text-slate-900">Verification Failed</h2>
          <p className="mt-2 text-sm text-slate-650">{error || "This prescription record could not be authenticated."}</p>
          <div className="border-t border-slate-100 my-5"></div>
          <button 
            onClick={() => window.location.href = "/"}
            className="inline-flex items-center gap-1 text-xs font-bold text-navy-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Hospital Portal
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* Verification Banner */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-2xl text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wide uppercase">Prescription Verified</h1>
              <p className="text-xs text-white/90 font-medium">This prescription has been authenticated as a genuine clinical record.</p>
            </div>
          </div>
          <Badge tone="success" className="bg-white/20 border border-white/40 text-white font-bold py-1 px-3 rounded-full text-xs">
            STATUS: AUTHENTIC
          </Badge>
        </div>

        {/* Prescription Metadata */}
        <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-6">
          {/* Hospital Row */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-navy-700" />
              <span className="font-extrabold text-slate-900 text-lg">{data.hospitalName}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Prescription ID</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{data.prescriptionId}</span>
            </div>
          </div>

          {/* Patient / Doctor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
            {/* Patient */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-200/60 pb-1.5">
                <User className="h-4 w-4 text-navy-700" /> Patient Details
              </div>
              <div className="grid grid-cols-3 gap-y-1 text-slate-650">
                <span className="col-span-1 text-xs text-slate-400 font-medium">UHID:</span>
                <span className="col-span-2 font-mono font-bold text-slate-800">{data.patientUhid}</span>

                <span className="col-span-1 text-xs text-slate-400 font-medium">Name:</span>
                <span className="col-span-2 font-semibold text-slate-800">{data.patientName}</span>

                <span className="col-span-1 text-xs text-slate-400 font-medium">Age / Sex:</span>
                <span className="col-span-2">{data.patientAge !== null ? `${data.patientAge} Yrs` : "—"} / {data.patientGender}</span>
              </div>
            </div>

            {/* Doctor */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-200/60 pb-1.5">
                <Stethoscope className="h-4 w-4 text-navy-700" /> Attending Practitioner
              </div>
              <div className="grid grid-cols-3 gap-y-1 text-slate-650">
                <span className="col-span-1 text-xs text-slate-400 font-medium">Doctor:</span>
                <span className="col-span-2 font-bold text-slate-800">Dr. {data.doctorName}</span>

                <span className="col-span-1 text-xs text-slate-400 font-medium">Department:</span>
                <span className="col-span-2 font-semibold">{data.departmentName}</span>

                <span className="col-span-1 text-xs text-slate-400 font-medium">Reg No:</span>
                <span className="col-span-2 font-mono">{data.doctorLicenseNo || "—"}</span>
              </div>
            </div>
          </div>

          {/* Assessment & Complaints */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-1.5 uppercase tracking-wide">Clinical Notes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                <span className="block text-slate-400 font-bold uppercase mb-1">Chief Complaint</span>
                <span className="text-slate-800 font-medium text-sm">{data.chiefComplaint || "None"}</span>
              </div>
              <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100 col-span-2">
                <span className="block text-slate-400 font-bold uppercase mb-1">Diagnosis</span>
                <span className="text-slate-800 font-bold text-sm">{data.diagnosis}</span>
              </div>
            </div>
          </div>

          {/* Medications Table */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
              <Pill className="h-4 w-4 text-navy-700" /> Prescribed Medications (Rx)
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <th className="py-2.5 px-4">Medicine</th>
                    <th className="py-2.5 px-3">Strength</th>
                    <th className="py-2.5 px-3">Dosage</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-4">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {data.medications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 px-4 text-center text-slate-400 font-medium italic">No medications prescribed.</td>
                    </tr>
                  ) : (
                    data.medications.map((med, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{med.name}</td>
                        <td className="py-2.5 px-3 font-medium">{med.strength || "—"}</td>
                        <td className="py-2.5 px-3">{med.dosage || "—"}</td>
                        <td className="py-2.5 px-3">{med.frequency || "—"}</td>
                        <td className="py-2.5 px-3">{med.duration || "—"}</td>
                        <td className="py-2.5 px-4 text-slate-500 font-medium">{med.instructions || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnostics Orders */}
          {(data.labOrders.length > 0 || data.radiologyOrders.length > 0) && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-1.5 uppercase tracking-wide">Diagnostics & Tests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {data.labOrders.length > 0 && (
                  <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                    <span className="block text-slate-400 font-bold uppercase mb-1">Laboratory Orders</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-800 font-semibold">
                      {data.labOrders.map((test, i) => <li key={i}>{test}</li>)}
                    </ul>
                  </div>
                )}
                {data.radiologyOrders.length > 0 && (
                  <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                    <span className="block text-slate-400 font-bold uppercase mb-1">Radiology Modalities</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-800 font-semibold">
                      {data.radiologyOrders.map((rad, i) => <li key={i}>{rad}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Advice & Follow-up */}
          {(data.advice || data.followUpDate) && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-1.5 uppercase tracking-wide">Advice & Instructions</h3>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                {data.advice && (
                  <div>
                    <span className="text-slate-400 font-bold block uppercase mb-0.5">Doctor's Advice</span>
                    <p className="text-slate-800 font-medium text-sm leading-relaxed">{data.advice}</p>
                  </div>
                )}
                {data.followUpDate && (
                  <div className="border-t border-slate-200/60 pt-2 flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase">Follow-up Visit Date</span>
                    <span className="font-bold text-red-600 bg-red-50 py-1 px-2.5 rounded-lg">
                      {new Date(data.followUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer branding */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 font-medium gap-2">
            <span className="flex items-center gap-1">
              <HeartHandshake className="h-3.5 w-3.5 text-navy-700" /> Digital Prescription Verification System
            </span>
            <span>Verified on {new Date(data.visitDate).toLocaleDateString("en-IN")}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
