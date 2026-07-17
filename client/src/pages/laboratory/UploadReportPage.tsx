import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, FileUp, Check, FlaskConical, User, BadgeCheck, FileText } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { TextareaField } from "../../components/ui/Field";
import { useUploadReport } from "../../features/laboratory";

interface TestReportState {
  observations: string;
  remarks: string;
  files: FileList | null;
}

export function UploadReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const uploadReport = useUploadReport();

  const request = location.state?.request;

  // Form State: record of { [testName: string]: TestReportState }
  const [testReports, setTestReports] = useState<Record<string, TestReportState>>({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!request) {
      toast.error("No active request selected.");
      navigate("/laboratory/processing");
      return;
    }

    const initial: Record<string, TestReportState> = {};
    request.tests.forEach((test: string) => {
      initial[test] = { observations: "", remarks: "", files: null };
    });
    setTestReports(initial);
  }, [request, navigate]);

  if (!request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if each test has at least one file selected
    for (const test of request.tests) {
      const rep = testReports[test];
      if (!rep || !rep.files || rep.files.length === 0) {
        toast.error(`Please select a report file for ${test}.`);
        return;
      }
    }

    const formData = new FormData();

    // Construct the structured reports array
    const reportsList = request.tests.map((test: string) => ({
      testName: test,
      observations: testReports[test]?.observations || "",
      remarks: testReports[test]?.remarks || ""
    }));

    formData.append("reportsData", JSON.stringify(reportsList));

    // Append each file using key format: `files_${testName}`
    request.tests.forEach((test: string) => {
      const rep = testReports[test];
      if (rep?.files) {
        for (let i = 0; i < rep.files.length; i++) {
          formData.append(`files_${test}`, rep.files[i]);
        }
      }
    });

    try {
      setIsUploading(true);
      await uploadReport.mutateAsync({ requestId: request._id, formData });
      toast.success("Diagnostic report files uploaded successfully!");
      navigate("/laboratory/processing");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload reports.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/laboratory/processing")}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileUp className="h-6 w-6 text-green-600" />
            Upload Diagnostic Report
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Enter findings and attach files for each requested study.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient / Request Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 border-b border-blue-100">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold shadow">
                  {request.patientName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{request.patientName}</span>
                    <BadgeCheck className="h-4 w-4 text-green-500" />
                  </div>
                  {request.patientUhid && (
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-block mt-1">
                      {request.patientUhid}
                    </span>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs">
                    {request.patientAge && (
                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[9px] block">Age</span>
                        <span className="text-slate-700 font-medium">{request.patientAge} Yrs</span>
                      </div>
                    )}
                    {request.patientGender && (
                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[9px] block">Gender</span>
                        <span className="text-slate-700 font-medium">{request.patientGender}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3.5 text-xs border-b border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[9px] block">Request ID</span>
                <span className="font-mono text-slate-700 font-bold">{request._id.toUpperCase()}</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[9px] block">Type</span>
                  <Badge tone={request.requestType === "Laboratory" ? "info" : request.requestType === "Combined" ? "success" : "warning"} className="mt-0.5">
                    {request.requestType}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[9px] block">Priority</span>
                  <Badge tone={request.priority === "STAT" ? "danger" : request.priority === "Urgent" ? "warning" : "neutral"} className="mt-0.5">
                    {request.priority}
                  </Badge>
                </div>
              </div>
            </div>

            {request.appointment?.chiefComplaint && (
              <div className="p-5 text-xs">
                <span className="text-slate-400 font-semibold uppercase text-[9px] block">Chief Complaint</span>
                <p className="text-slate-700 font-medium mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {request.appointment.chiefComplaint}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Dynamic Form Fields per Test */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {request.tests.map((testName: string) => {
                const report = testReports[testName] || { observations: "", remarks: "", files: null };
                return (
                  <Card key={testName} className="p-5 space-y-4">
                    <h3 className="font-bold text-base text-slate-800 border-b pb-2.5 flex items-center gap-2">
                      <FlaskConical className="h-5 w-5 text-blue-600" />
                      {testName}
                    </h3>

                    <TextareaField
                      label="Observations / Findings"
                      required
                      placeholder={`Enter specific diagnostic analysis and findings for ${testName}...`}
                      value={report.observations}
                      onChange={(e) => setTestReports(prev => ({
                        ...prev,
                        [testName]: { ...prev[testName], observations: e.target.value }
                      }))}
                    />

                    <TextareaField
                      label="Technical Remarks / Recommendations"
                      placeholder={`Enter technical remarks or recommendations for ${testName}...`}
                      value={report.remarks}
                      onChange={(e) => setTestReports(prev => ({
                        ...prev,
                        [testName]: { ...prev[testName], remarks: e.target.value }
                      }))}
                    />

                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Attachment <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          required
                          accept="application/pdf,image/png,image/jpeg,image/jpg"
                          onChange={(e) => setTestReports(prev => ({
                            ...prev,
                            [testName]: { ...prev[testName], files: e.target.files }
                          }))}
                          className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                        />
                      </div>
                      {report.files && report.files.length > 0 && (
                        <div className="mt-2 text-xs text-slate-600 font-medium flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-slate-400" />
                          Selected File: <span className="font-semibold text-slate-800">{report.files[0].name}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <Button
                variant="secondary"
                disabled={isUploading}
                onClick={() => navigate("/laboratory/processing")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6"
              >
                {isUploading ? "Uploading..." : "Save & Submit Reports"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
