import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { socket } from "../../lib/socket";
import { Mail, CheckCircle2, Archive, MessageSquare } from "lucide-react";

interface Enquiry {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "pending" | "responded" | "archived";
  createdAt: string;
}

export function EnquiriesPage() {
  const queryClient = useQueryClient();

  // --- QUERY ENQUIRIES ---
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["enquiries"],
    queryFn: async () => {
      const res = await api.get("/hospitals/enquiries");
      return res.data.data.enquiries as Enquiry[];
    }
  });

  // --- MUTATION FOR ENQUIRY STATUS ---
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/hospitals/enquiries/${id}`, { status });
      return res.data.data.enquiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
    }
  });

  // --- SOCKET.IO REAL-TIME LISTENER ---
  useEffect(() => {
    const handleNewEnquiry = (data: any) => {
      console.log("Socket: New enquiry received!", data);
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
    };

    socket.on("new_enquiry", handleNewEnquiry);
    socket.on("dashboard_update", handleNewEnquiry); // Fallback generic sync

    return () => {
      socket.off("new_enquiry", handleNewEnquiry);
      socket.off("dashboard_update", handleNewEnquiry);
    };
  }, [queryClient]);

  const updateStatus = (id: string, status: "responded" | "archived") => {
    statusMutation.mutate({ id, status });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading patient enquiries...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Patient Enquiries</h1>
        <p className="text-sm text-slate-500">View and respond to inquiries submitted by patients through the public hospital website contact form.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b">
                <tr>
                  <th className="py-3 px-4">Date Submitted</th>
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries.map((enq) => (
                  <tr key={enq._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap text-slate-450 font-mono">
                      {new Date(enq.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800">{enq.name}</div>
                      <a href={`mailto:${enq.email}`} className="text-slate-450 hover:underline">{enq.email}</a>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-750">
                      {enq.subject}
                    </td>
                    <td className="py-4 px-4 max-w-xs break-words whitespace-pre-line text-slate-600 leading-relaxed">
                      {enq.message}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block rounded px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                        enq.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-250/50" :
                        enq.status === "responded" ? "bg-emerald-50 text-emerald-700 border border-emerald-250/50" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {enq.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap space-x-2">
                      {enq.status === "pending" && (
                        <Button
                          onClick={() => updateStatus(enq._id, "responded")}
                          variant="secondary"
                          className="inline-flex items-center gap-1 text-[10px] py-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Mark Responded
                        </Button>
                      )}
                      {enq.status !== "archived" && (
                        <Button
                          onClick={() => updateStatus(enq._id, "archived")}
                          variant="secondary"
                          className="inline-flex items-center gap-1 text-[10px] py-1"
                        >
                          <Archive className="h-3 w-3" /> Archive
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {enquiries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Mail className="h-8 w-8 text-slate-300" />
                        <span>No patient enquiries found in the registry.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
