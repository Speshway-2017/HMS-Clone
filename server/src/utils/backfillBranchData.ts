import { LabOrder } from "../models/LabOrder";
import { RadiologyOrder } from "../models/RadiologyOrder";
import { DiagnosticReport } from "../models/DiagnosticReport";
import { Prescription } from "../models/Prescription";
import { Appointment } from "../models/Appointment";
import { Doctor } from "../models/Doctor";

/**
 * Safely backfills missing branch fields on pre-existing LabOrder, RadiologyOrder,
 * and DiagnosticReport documents by deriving branch context from associated Appointment or Doctor.
 */
export async function backfillLabBranchData(): Promise<void> {
  try {
    // 1. Backfill LabOrders missing branch
    const unbranchedLabOrders = await LabOrder.find({ branch: null });
    for (const order of unbranchedLabOrders) {
      let derivedBranch = null;
      if (order.appointment) {
        const appt = await Appointment.findById(order.appointment);
        if (appt && appt.branch) {
          derivedBranch = appt.branch;
        }
      }
      if (!derivedBranch && order.doctor) {
        const doc = await Doctor.findById(order.doctor);
        if (doc && doc.branch) {
          derivedBranch = doc.branch;
        }
      }
      if (derivedBranch) {
        order.branch = derivedBranch as any;
        await order.save();
      }
    }

    // 2. Backfill RadiologyOrders missing branch
    const unbranchedRadOrders = await RadiologyOrder.find({ branch: null });
    for (const order of unbranchedRadOrders) {
      let derivedBranch = null;
      if (order.appointment) {
        const appt = await Appointment.findById(order.appointment);
        if (appt && appt.branch) {
          derivedBranch = appt.branch;
        }
      }
      if (!derivedBranch && order.doctor) {
        const doc = await Doctor.findById(order.doctor);
        if (doc && doc.branch) {
          derivedBranch = doc.branch;
        }
      }
      if (derivedBranch) {
        order.branch = derivedBranch as any;
        await order.save();
      }
    }

    // 3. Backfill DiagnosticReports missing branch
    const unbranchedReports = await DiagnosticReport.find({ branch: null });
    for (const report of unbranchedReports) {
      let derivedBranch = null;
      if (report.requestId) {
        const labOrd = await LabOrder.findById(report.requestId);
        if (labOrd && labOrd.branch) {
          derivedBranch = labOrd.branch;
        } else {
          const radOrd = await RadiologyOrder.findById(report.requestId);
          if (radOrd && radOrd.branch) {
            derivedBranch = radOrd.branch;
          }
        }
      }
      if (!derivedBranch && report.appointment) {
        const appt = await Appointment.findById(report.appointment);
        if (appt && appt.branch) {
          derivedBranch = appt.branch;
        }
      }
      if (!derivedBranch && report.doctor) {
        const doc = await Doctor.findById(report.doctor);
        if (doc && doc.branch) {
          derivedBranch = doc.branch;
        }
      }
      if (derivedBranch) {
        report.branch = derivedBranch as any;
        await report.save();
      }
    }

    // 4. Backfill Prescriptions missing branch
    const unbranchedPrescriptions = await Prescription.find({ branch: null });
    for (const rx of unbranchedPrescriptions) {
      let derivedBranch = null;
      if (rx.appointment) {
        const appt = await Appointment.findById(rx.appointment);
        if (appt && appt.branch) {
          derivedBranch = appt.branch;
        }
      }
      if (!derivedBranch && rx.doctor) {
        const doc = await Doctor.findById(rx.doctor);
        if (doc && doc.branch) {
          derivedBranch = doc.branch;
        }
      }
      if (derivedBranch) {
        rx.branch = derivedBranch as any;
        await rx.save();
      }
    }
  } catch (err) {
    console.error("Backfill branch data error:", err);
  }
}
