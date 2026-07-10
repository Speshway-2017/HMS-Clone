import { useState, useEffect } from "react";
import { 
  Banknote, 
  Search, 
  Eye, 
  Printer, 
  Calculator, 
  CheckCircle,
  FileText,
  User,
  Activity
} from "lucide-react";
import { useDoctors } from "../../features/doctors";
import { useStaffList } from "../../features/staff";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { InputField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

interface PayrollRun {
  employeeId: string;
  name: string;
  role: string;
  basicSalary: number;
  allowance: number;
  deductions: number;
  netSalary: number;
  status: "Calculated" | "Paid";
  month: string;
  paidAt?: string;
}

export function AccountantPayrollPage() {
  const [search, setSearch] = useState("");
  const [payrollMonth, setPayrollMonth] = useState("July 2026");
  const [runs, setRuns] = useState<Record<string, PayrollRun>>({});
  
  // Modals state
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Salary Calculator inputs
  const [basicSalary, setBasicSalary] = useState(65000);
  const [allowance, setAllowance] = useState(5000);
  const [deductions, setDeductions] = useState(3200);

  // Queries for real employee data
  const { data: doctorsData, isLoading: docsLoading } = useDoctors({} as any);
  const { data: staffData, isLoading: staffLoading } = useStaffList({} as any);

  // Combine Doctors & Staff into unified employee registry
  const employees: any[] = [];

  if (doctorsData?.data) {
    doctorsData.data.forEach((doc: any) => {
      employees.push({
        _id: doc._id,
        name: doc.name,
        role: doc.specialization ? `Doctor (${doc.specialization})` : "Doctor",
        employeeId: doc.licenseNo || `DOC-${doc._id.slice(-5).toUpperCase()}`,
        email: doc.email,
        phone: doc.phone,
        type: "doctor"
      });
    });
  }

  if (staffData?.data) {
    staffData.data.forEach((st: any) => {
      employees.push({
        _id: st._id,
        name: st.name,
        role: st.role || "Medical Staff",
        employeeId: st.employeeId || `STF-${st._id.slice(-5).toUpperCase()}`,
        email: st.email,
        phone: st.phone,
        type: "staff"
      });
    });
  }

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("hms_payroll");
    if (saved) {
      setRuns(JSON.parse(saved));
    }
  }, []);

  const saveRuns = (newRuns: Record<string, PayrollRun>) => {
    setRuns(newRuns);
    localStorage.setItem("hms_payroll", JSON.stringify(newRuns));
  };

  const handleOpenCalc = (emp: any) => {
    setSelectedEmployee(emp);
    // Suggest basic salaries based on roles
    if (emp.type === "doctor") {
      setBasicSalary(120000);
      setAllowance(15000);
      setDeductions(8500);
    } else {
      setBasicSalary(45000);
      setAllowance(4000);
      setDeductions(3100);
    }
    setIsCalcOpen(true);
  };

  const handleCalcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const netSalary = basicSalary + allowance - deductions;
    const newRuns = {
      ...runs,
      [`${selectedEmployee._id}_${payrollMonth}`]: {
        employeeId: selectedEmployee.employeeId,
        name: selectedEmployee.name,
        role: selectedEmployee.role,
        basicSalary,
        allowance,
        deductions,
        netSalary,
        status: "Calculated" as const,
        month: payrollMonth
      }
    };

    saveRuns(newRuns);
    setIsCalcOpen(false);
  };

  const handleProcessPayment = (key: string) => {
    const newRuns = {
      ...runs,
      [key]: {
        ...runs[key],
        status: "Paid" as const,
        paidAt: new Date().toISOString()
      }
    };
    saveRuns(newRuns);
  };

  const handleOpenPayslip = (emp: any) => {
    setSelectedEmployee(emp);
    setIsPayslipOpen(true);
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    return emp.name.toLowerCase().includes(search.toLowerCase()) || 
           emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
           emp.role.toLowerCase().includes(search.toLowerCase());
  });

  // Calculations
  const calculatedCount = Object.values(runs).filter(r => r.status === "Calculated").length;
  const paidCount = Object.values(runs).filter(r => r.status === "Paid").length;
  const paidTotal = Object.values(runs).filter(r => r.status === "Paid").reduce((sum, r) => sum + r.netSalary, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Management</h1>
          <p className="text-sm text-slate-500">Calculate salaries, generate payslips, and record employee disbursements.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-semibold">Active Month:</span>
          <select 
            value={payrollMonth} 
            onChange={(e) => setPayrollMonth(e.target.value)}
            className="rounded-lg border border-slate-350 px-3 py-1.5 text-sm text-slate-700 outline-none bg-white font-semibold"
          >
            <option value="June 2026">June 2026</option>
            <option value="July 2026">July 2026</option>
            <option value="August 2026">August 2026</option>
          </select>
        </div>
      </div>

      {/* Payroll Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard 
          label="Calculated Salaries" 
          value={`${calculatedCount} employees`} 
          icon={<Calculator className="h-5 w-5" />} 
        />
        <KpiCard 
          label="Paid Salaries (Disbursed)" 
          value={`${paidCount} employees`} 
          icon={<CheckCircle className="h-5 w-5" />} 
        />
        <KpiCard 
          label="Disbursed Volume (Paid)" 
          value={`₹${paidTotal.toLocaleString("en-IN")}`} 
          icon={<Banknote className="h-5 w-5" />} 
          emphasis 
        />
      </div>

      {/* Employees Salary calculations list */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search employee, ID, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-350 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[850px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Role / Spec</th>
                <th className="px-4 py-3">Salary Calculated</th>
                <th className="px-4 py-3">Net Salary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docsLoading || staffLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading registry...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No employees found in doctors or staff collection.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const runKey = `${emp._id}_${payrollMonth}`;
                  const run = runs[runKey];
                  return (
                    <tr key={emp._id} className="hover:bg-slate-55 text-slate-700">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {emp.employeeId}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {emp.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {emp.role}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-semibold">
                        {run ? `₹${run.basicSalary.toLocaleString("en-IN")}` : "Not Run"}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {run ? `₹${run.netSalary.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {run ? (
                          <Badge tone={run.status === "Paid" ? "success" : "warning"} className="w-36">
                            {run.status}
                          </Badge>
                        ) : (
                          <Badge tone="neutral" className="w-36">Unprocessed</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {!run ? (
                          <button
                            onClick={() => handleOpenCalc(emp)}
                            className="inline-flex items-center gap-1 rounded bg-navy-700 hover:bg-navy-800 text-white px-2 py-1 text-xs font-semibold shadow"
                          >
                            <Calculator className="h-3 w-3" /> Calculate
                          </button>
                        ) : (
                          <>
                            {run.status === "Calculated" && (
                              <button
                                onClick={() => handleProcessPayment(runKey)}
                                className="inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs font-semibold shadow"
                              >
                                Disburse
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenPayslip(emp)}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs font-semibold border"
                              title="View Payslip"
                            >
                              <Eye className="h-3 w-3" /> Payslip
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Calculate Salary */}
      <Modal
        title="Run Salary Calculation"
        isOpen={isCalcOpen}
        onClose={() => {
          setIsCalcOpen(false);
          setSelectedEmployee(null);
        }}
      >
        {selectedEmployee && (
          <form onSubmit={handleCalcSubmit} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 border">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee</span>
                <span className="font-semibold text-slate-800">{selectedEmployee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role</span>
                <span className="font-semibold text-slate-800">{selectedEmployee.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Processing Month</span>
                <span className="font-bold text-navy-700">{payrollMonth}</span>
              </div>
            </div>

            <InputField
              label="Basic Salary (₹)"
              type="number"
              value={basicSalary}
              onChange={(e) => setBasicSalary(Number(e.target.value))}
              required
            />
            <InputField
              label="Allowances (Bonus, Perks) (₹)"
              type="number"
              value={allowance}
              onChange={(e) => setAllowance(Number(e.target.value))}
            />
            <InputField
              label="Deductions (Tax, PF, Leaves) (₹)"
              type="number"
              value={deductions}
              onChange={(e) => setDeductions(Number(e.target.value))}
            />

            <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center text-xs font-bold border-t border-b">
              <span className="text-slate-850">Estimated Net Salary:</span>
              <span className="text-navy-700 text-sm">₹{(basicSalary + allowance - deductions).toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => { setIsCalcOpen(false); setSelectedEmployee(null); }}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Approve Salary
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: View Payslip */}
      <Modal
        title="Payslip Preview"
        isOpen={isPayslipOpen}
        onClose={() => {
          setIsPayslipOpen(false);
          setSelectedEmployee(null);
        }}
      >
        {selectedEmployee && runs[`${selectedEmployee._id}_${payrollMonth}`] && (
          <div className="space-y-6">
            {/* Payslip details */}
            <div id="payslip-print" className="space-y-4 text-xs">
              <div className="flex justify-between border-b pb-4">
                <div>
                  <h3 className="text-base font-bold text-navy-700">HMS Enterprise</h3>
                  <p className="text-[10px] text-slate-500">Employee Payslip Receipt</p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-slate-800">SALARY STATEMENT</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">{payrollMonth}</p>
                </div>
              </div>

              {/* Employee Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Employee Info:</span>
                  <p className="font-semibold text-slate-850">{selectedEmployee.name}</p>
                  <p className="text-slate-500">ID: {selectedEmployee.employeeId}</p>
                  <p className="text-slate-500">Role: {selectedEmployee.role}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Status:</span>
                  <p className="font-bold text-emerald-600 uppercase mt-0.5">
                    {runs[`${selectedEmployee._id}_${payrollMonth}`].status}
                  </p>
                  {runs[`${selectedEmployee._id}_${payrollMonth}`].paidAt && (
                    <p className="text-[10px] text-slate-500">
                      Paid: {new Date(runs[`${selectedEmployee._id}_${payrollMonth}`].paidAt!).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Salary Breakdown table */}
              <table className="w-full text-left border">
                <thead className="bg-slate-50">
                  <tr className="border-b font-semibold text-slate-500 whitespace-nowrap">
                    <th className="py-2 px-2">Salary Component</th>
                    <th className="py-2 px-2 text-right">Inflow (₹)</th>
                    <th className="py-2 px-2 text-right">Deduction (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-2 font-medium">Basic Salary</td>
                    <td className="py-2 px-2 text-right">₹{runs[`${selectedEmployee._id}_${payrollMonth}`].basicSalary.toLocaleString("en-IN")}</td>
                    <td className="py-2 px-2 text-right">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-medium">Allowance & Bonuses</td>
                    <td className="py-2 px-2 text-right">₹{runs[`${selectedEmployee._id}_${payrollMonth}`].allowance.toLocaleString("en-IN")}</td>
                    <td className="py-2 px-2 text-right">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-medium">Professional Tax, PF, Deductions</td>
                    <td className="py-2 px-2 text-right">—</td>
                    <td className="py-2 px-2 text-right text-red-500">₹{runs[`${selectedEmployee._id}_${payrollMonth}`].deductions.toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>

              {/* Final calculation */}
              <div className="flex justify-end">
                <div className="flex w-64 justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                  <span className="text-slate-800">Net Salary Disbursed:</span>
                  <span className="text-navy-700">₹{runs[`${selectedEmployee._id}_${payrollMonth}`].netSalary.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print Payslip
              </Button>
              <Button variant="primary" onClick={() => setIsPayslipOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
