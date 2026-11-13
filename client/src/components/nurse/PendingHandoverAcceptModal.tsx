import React from "react";
import { X, CheckCircle, ArrowRight, User, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAcceptShiftHandover } from "../../features/nurse";

interface PendingHandoverAcceptModalProps {
  handover: any;
  onClose: () => void;
}

export const PendingHandoverAcceptModal: React.FC<PendingHandoverAcceptModalProps> = ({ handover, onClose }) => {
  const acceptShiftHandover = useAcceptShiftHandover();

  if (!handover) return null;

  const handleAccept = async () => {
    try {
      await acceptShiftHandover.mutateAsync(handover._id);
      toast.success("Shift handover accepted! Patient roster transferred to your active duty.");
      onClose();
    } catch (err: any) {
      toast.error("Failed to accept shift handover.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Incoming Duty Signoff
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-1 font-sans">Accept Incoming Shift Handover</h3>
            <p className="text-xs text-slate-500 font-sans">Review incoming patient roster from outgoing shift nurse.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl space-y-3 text-xs border border-slate-200/80">
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Outgoing Nurse</span>
            <span className="font-extrabold text-slate-800">{handover.loggedByName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Shift Cycle</span>
            <span className="font-bold text-emerald-700">{handover.currentShift} → {handover.nextShift}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Patients Count</span>
            <span className="font-bold text-slate-800">{handover.patientsHandedOverCount} Ward Patients</span>
          </div>
        </div>

        {handover.remarks && (
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-sans">Handover Notes & Remarks</span>
            <p className="text-xs bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-amber-950 font-medium leading-relaxed font-sans">
              {handover.remarks}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs bg-white hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-sans"
          >
            Review Later
          </button>
          <button
            onClick={handleAccept}
            disabled={acceptShiftHandover.isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer font-sans disabled:opacity-50"
          >
            {acceptShiftHandover.isPending ? "Accepting..." : "Accept Shift Handover"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
