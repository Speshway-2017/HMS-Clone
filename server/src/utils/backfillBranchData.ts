import { LabOrder } from "../models/LabOrder";
import { RadiologyOrder } from "../models/RadiologyOrder";
import { DiagnosticReport } from "../models/DiagnosticReport";
import { Prescription } from "../models/Prescription";
import { Appointment } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { Admission } from "../models/Admission";
import { AdmissionRequest } from "../models/AdmissionRequest";
import { Invoice } from "../models/Invoice";
import { Payment } from "../models/Payment";
import { Bed } from "../models/Bed";
import { Room } from "../models/Room";

/**
 * Safely backfills and aligns branch context for Beds, Admissions, AdmissionRequests,
 * Invoices, Payments, LabOrder, RadiologyOrder, DiagnosticReport, and Prescription documents.
 */
export async function backfillLabBranchData(): Promise<void> {
  try {
    // 0a. Align Beds with parent Room branch
    const allBeds = await Bed.find({});
    for (const bed of allBeds) {
      if (bed.room) {
        const room = await Room.findById(bed.room);
        const targetBranch = room ? (room.branch || null) : null;
        if (String(bed.branch || null) !== String(targetBranch || null)) {
          bed.branch = targetBranch as any;
          await bed.save();
        }
      }
    }

    // 0b. Align Admissions with allocated Room branch
    const allAdmissions = await Admission.find({});
    for (const adm of allAdmissions) {
      if (adm.room) {
        const room = await Room.findById(adm.room);
        let targetBranch = room ? (room.branch || null) : null;
        if (!targetBranch && adm.patient) {
          const pat = await Patient.findById(adm.patient);
          if (pat && pat.branch) targetBranch = pat.branch;
        }
        if (String(adm.branch || null) !== String(targetBranch || null)) {
          adm.branch = targetBranch as any;
          await adm.save();
        }
      }
    }

    // 0c. Backfill AdmissionRequests missing branch
    const unbranchedAdmissionRequests = await AdmissionRequest.find({ branch: null });
    for (const req of unbranchedAdmissionRequests) {
      let derivedBranch = null;
      if (req.doctor) {
        const doc = await Doctor.findById(req.doctor);
        if (doc && doc.branch) derivedBranch = doc.branch;
      }
      if (!derivedBranch && req.patient) {
        const pat = await Patient.findById(req.patient);
        if (pat && pat.branch) derivedBranch = pat.branch;
      }
      if (derivedBranch) {
        req.branch = derivedBranch as any;
        await req.save();
      }
    }

    // 0d. Backfill Invoices missing branch from Admission/Patient
    const unbranchedInvoices = await Invoice.find({ branch: null });
    for (const inv of unbranchedInvoices) {
      let derivedBranch = null;
      if (inv.patient) {
        const pat = await Patient.findById(inv.patient);
        if (pat && pat.branch) derivedBranch = pat.branch;
      }
      if (derivedBranch) {
        inv.branch = derivedBranch as any;
        await inv.save();
      }
    }

    // 0e. Backfill Payments missing branch
    const unbranchedPayments = await Payment.find({ branch: null });
    for (const pmt of unbranchedPayments) {
      let derivedBranch = null;
      if (pmt.patient) {
        const pat = await Patient.findById(pmt.patient);
        if (pat && pat.branch) derivedBranch = pat.branch;
      }
      if (!derivedBranch && pmt.invoice) {
        const inv = await Invoice.findById(pmt.invoice);
        if (inv && inv.branch) derivedBranch = inv.branch;
      }
      if (derivedBranch) {
        pmt.branch = derivedBranch as any;
        await pmt.save();
      }
    }

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
