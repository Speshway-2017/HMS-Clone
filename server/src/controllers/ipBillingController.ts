import { Request, Response } from "express";
import mongoose from "mongoose";
import { Admission } from "../models/Admission";
import { Patient } from "../models/Patient";
import { LabOrder } from "../models/LabOrder";
import { RadiologyOrder } from "../models/RadiologyOrder";
import { Prescription } from "../models/Prescription";
import { Appointment } from "../models/Appointment";
import { InventoryItem } from "../models/InventoryItem";
import { IPCharge } from "../models/IPCharge";
import { Invoice } from "../models/Invoice";
import { Bed } from "../models/Bed";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { emitToHospital } from "../config/socket";
import { buildBranchQuery } from "../utils/branchQueryHelper";

// Helper: Calculate admission duration in days (minimum 1 day)
const calculateDays = (admissionDate: Date, dischargeDate?: Date | null): number => {
  const start = new Date(admissionDate);
  const end = dischargeDate ? new Date(dischargeDate) : new Date();
  // Set times to midnight to calculate calendar day difference
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
};

// Helper: Standard rates for Ward types
const getWardRate = (wardType: string): number => {
  switch (wardType) {
    case "ICU":
      return 8000;
    case "NICU":
      return 7000;
    case "Private Ward":
      return 4000;
    case "Semi-Private Ward":
      return 2000;
    case "General Ward":
      return 1000;
    case "Emergency Ward":
      return 3000;
    default:
      return 1500;
  }
};

// Helper: Standard rates for Lab Tests
const getLabTestRate = (testName: string): number => {
  const name = testName.toLowerCase();
  if (name.includes("cbc") || name.includes("complete blood count")) return 300;
  if (name.includes("lipid")) return 600;
  if (name.includes("liver") || name.includes("lft")) return 800;
  if (name.includes("kidney") || name.includes("kft") || name.includes("renal")) return 700;
  if (name.includes("sugar") || name.includes("glucose")) return 150;
  if (name.includes("thyroid") || name.includes("tsh")) return 500;
  return 400;
};

// Helper: Standard rates for Radiology scans
const getRadiologyRate = (scanType: string): number => {
  const type = scanType.toLowerCase();
  if (type.includes("x-ray") || type.includes("xray")) return 500;
  if (type.includes("ct")) return 3000;
  if (type.includes("mri")) return 6000;
  if (type.includes("ultrasound") || type.includes("usg")) return 1200;
  return 800;
};

// Helper: Assemble all running bill charges (manual + system-generated)
const getIPRunningCharges = async (admission: any, hospitalId: any) => {
  const patientId = admission.patient._id || admission.patient;

  // Load hospital to retrieve lab/radiology prices
  const hospitalDoc = await mongoose.model("Hospital").findById(hospitalId).lean();
  const prices = (hospitalDoc as any)?.investigationPrices || {};

  const getLabTestRate = (testName: string): number => {
    if (prices && prices[testName] !== undefined) return prices[testName];
    const matchedKey = Object.keys(prices).find(k => k.toLowerCase() === testName.toLowerCase());
    if (matchedKey) return prices[matchedKey];
    
    const name = testName.toLowerCase();
    if (name.includes("cbc") || name.includes("complete blood count")) return 300;
    if (name.includes("lipid")) return 600;
    if (name.includes("liver") || name.includes("lft")) return 800;
    if (name.includes("kidney") || name.includes("kft") || name.includes("renal")) return 700;
    if (name.includes("sugar") || name.includes("glucose")) return 150;
    if (name.includes("thyroid") || name.includes("tsh")) return 500;
    return 400;
  };

  const getRadiologyRate = (scanType: string): number => {
    if (prices && prices[scanType] !== undefined) return prices[scanType];
    const matchedKey = Object.keys(prices).find(k => k.toLowerCase() === scanType.toLowerCase());
    if (matchedKey) return prices[matchedKey];

    const type = scanType.toLowerCase();
    if (type.includes("x-ray") || type.includes("xray")) return 500;
    if (type.includes("ct")) return 3000;
    if (type.includes("mri")) return 6000;
    if (type.includes("ultrasound") || type.includes("usg")) return 1200;
    return 800;
  };

  // 1. Fetch manual IP Charges
  const manualCharges = await IPCharge.find({ admission: admission._id, hospital: hospitalId }).lean();
  const allCharges: any[] = [];

  // Define date limits safely to handle midnight/timezone mismatches
  const stayStart = new Date(admission.admissionDate);
  stayStart.setHours(0, 0, 0, 0);
  stayStart.setDate(stayStart.getDate() - 1);

  const stayEnd = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
  stayEnd.setHours(23, 59, 59, 999);

  // Helper to push charges ensuring uniqueness
  const pushUniqueCharge = (charge: any) => {
    if (!allCharges.some(x => x.externalId === charge.externalId)) {
      allCharges.push({
        ...charge,
        generatedBy: charge.generatedBy || "System",
        department: charge.department || "Billing",
        postedAt: charge.postedAt || new Date()
      });
    }
  };

  // Add manual charges first
  manualCharges.forEach((c: any) => {
    pushUniqueCharge({
      ...c,
      externalId: c.externalId || `manual-${c._id}`
    });
  });

  // 2. Accommodation charges and Nursing daily charges from history
  if (admission.accommodationHistory && admission.accommodationHistory.length > 0) {
    admission.accommodationHistory.forEach((historyEntry: any, index: number) => {
      const entryDays = calculateDays(
        historyEntry.startDate,
        historyEntry.endDate || new Date()
      );
      
      // Accommodation Rent
      pushUniqueCharge({
        _id: `sys-accommodation-${historyEntry._id || index}`,
        category: "Accommodation Charges",
        serviceName: `Accommodation: ${historyEntry.ward} (${historyEntry.roomType || "Non AC"}) - Room ${historyEntry.room?.roomNumber || "N/A"}, Bed ${historyEntry.bed?.bedNumber || "N/A"}`,
        quantity: entryDays,
        unitPrice: historyEntry.dailyTariff,
        discount: 0,
        tax: 0,
        remarks: `Calculated for ${entryDays} days of stay`,
        total: entryDays * historyEntry.dailyTariff,
        isSystemGenerated: true,
        externalId: `sys-accommodation-${historyEntry._id || index}`,
        generatedBy: "System",
        department: "Admission",
        postedAt: historyEntry.startDate
      });

      // Nursing daily charges
      const nursingRate = historyEntry.nursingTariff !== undefined ? historyEntry.nursingTariff : 300;
      pushUniqueCharge({
        _id: `sys-nursing-${historyEntry._id || index}`,
        category: "Nursing Charges",
        serviceName: `Daily Inpatient Nursing Package - ${historyEntry.ward}`,
        quantity: entryDays,
        unitPrice: nursingRate,
        discount: 0,
        tax: 0,
        remarks: `Daily nursing kit and care package`,
        total: entryDays * nursingRate,
        isSystemGenerated: true,
        externalId: `sys-nursing-${historyEntry._id || index}`,
        generatedBy: "System",
        department: "Nursing",
        postedAt: historyEntry.startDate
      });
    });
  } else {
    // Fallback for legacy admissions
    const days = calculateDays(admission.admissionDate, admission.dischargeDate);
    const roomRate = getWardRate(admission.ward);
    
    pushUniqueCharge({
      _id: `sys-accommodation-fallback`,
      category: "Accommodation Charges",
      serviceName: `Accommodation: ${admission.ward} - Room ${admission.room?.roomNumber || "N/A"}, Bed ${admission.bed?.bedNumber || "N/A"}`,
      quantity: days,
      unitPrice: roomRate,
      discount: 0,
      tax: 0,
      remarks: `Calculated for ${days} days of stay (Fallback)`,
      total: days * roomRate,
      isSystemGenerated: true,
      externalId: `sys-accommodation-fallback`,
      generatedBy: "System",
      department: "Admission",
      postedAt: admission.admissionDate
    });

    pushUniqueCharge({
      _id: `sys-nursing-fallback`,
      category: "Nursing Charges",
      serviceName: "Daily Inpatient Nursing Care & Monitoring (Legacy Fallback)",
      quantity: days,
      unitPrice: 300,
      discount: 0,
      tax: 0,
      remarks: `Calculated for ${days} days of stay`,
      total: days * 300,
      isSystemGenerated: true,
      externalId: `sys-nursing-fallback`,
      generatedBy: "System",
      department: "Nursing",
      postedAt: admission.admissionDate
    });
  }

  // 3. Admission Charges
  pushUniqueCharge({
    _id: `sys-adm-fee`,
    category: "Admission Charges",
    serviceName: "Admission Booking & Kit Fee",
    quantity: 1,
    unitPrice: 500,
    discount: 0,
    tax: 0,
    remarks: "Includes Admission Kit and Registration charges",
    total: 500,
    isSystemGenerated: true,
    externalId: `sys-adm-fee`,
    generatedBy: "System",
    department: "Admission",
    postedAt: admission.admissionDate
  });

  // 4. Doctor Charges (Consultations/Visits/Surgery/Procedures during stay)
  const appointments = await Appointment.find({
    patient: patientId,
    hospital: hospitalId,
    status: "completed",
    date: { $gte: stayStart, $lte: stayEnd }
  }).populate("doctor", "name specialization consultationFee").lean();

  const seenDoctorVisits = new Set<string>();
  const seenProcedures = new Set<string>();

  appointments.forEach((appt: any) => {
    const docName = appt.doctor?.name || "Consultant Doctor";
    const apptType = appt.type || "Consultation";

    if (apptType === "Consultation") {
      const visitDateStr = new Date(appt.date).toDateString();
      const uniqueKey = `${docName.toLowerCase()}-${visitDateStr}`;
      if (seenDoctorVisits.has(uniqueKey)) return;
      seenDoctorVisits.add(uniqueKey);

      const feeStr = appt.doctor?.consultationFee || "₹500";
      const fee = parseFloat(feeStr.replace(/[^0-9.]/g, "")) || 500;
      
      pushUniqueCharge({
        _id: `sys-appt-${appt._id}`,
        category: "Doctor Charges",
        serviceName: `Consultation - Dr. ${docName}`,
        quantity: 1,
        unitPrice: fee,
        discount: 0,
        tax: 0,
        remarks: `Inpatient round visit on ${new Date(appt.date).toLocaleDateString()}`,
        total: fee,
        isSystemGenerated: true,
        externalId: `sys-appt-${appt._id}`,
        generatedBy: `Dr. ${docName}`,
        department: "Doctor Visits",
        postedAt: appt.date
      });
    } else if (apptType === "Procedure") {
      const procName = appt.notes || "Treatment Procedure";
      const procDateStr = new Date(appt.date).toDateString();
      const uniqueKey = `${procName.toLowerCase()}-${procDateStr}`;
      if (seenProcedures.has(uniqueKey)) return;
      seenProcedures.add(uniqueKey);

      pushUniqueCharge({
        _id: `sys-proc-${appt._id}`,
        category: "Procedure Charges",
        serviceName: `Procedure: ${procName} - Dr. ${docName}`,
        quantity: 1,
        unitPrice: 3500,
        discount: 0,
        tax: 0,
        remarks: `Inpatient clinical procedure on ${new Date(appt.date).toLocaleDateString()}`,
        total: 3500,
        isSystemGenerated: true,
        externalId: `sys-proc-${appt._id}`,
        generatedBy: `Dr. ${docName}`,
        department: "Clinical Procedures",
        postedAt: appt.date
      });
    } else if (apptType === "Surgery") {
      const surgItems = [
        { category: "Operation Theatre Charges", desc: `Surgeon Fee (Surgery) - Dr. ${docName}`, price: 12000, ext: `sys-surg-fee-${appt._id}`, dept: "Surgery" },
        { category: "Operation Theatre Charges", desc: "Assistant Surgeon Fee", price: 4000, ext: `sys-surg-ast-${appt._id}`, dept: "Surgery" },
        { category: "Operation Theatre Charges", desc: "Anaesthetist Fee", price: 6000, ext: `sys-surg-anes-${appt._id}`, dept: "Surgery" },
        { category: "Operation Theatre Charges", desc: "OT Theater & Maintenance Charges", price: 15000, ext: `sys-surg-ot-${appt._id}`, dept: "Operation Theatre" },
        { category: "Consumables", desc: "OT Specialized Consumables & Kits", price: 4500, ext: `sys-surg-con-${appt._id}`, dept: "Store" },
        { category: "Equipment Charges", desc: "OT Monitoring & Life Support Equipment Rent", price: 3000, ext: `sys-surg-eq-${appt._id}`, dept: "Equipment" },
        { category: "Miscellaneous Charges", desc: "Post-Operative Recovery Room Charges", price: 2500, ext: `sys-surg-rec-${appt._id}`, dept: "Recovery" }
      ];

      surgItems.forEach(item => {
        pushUniqueCharge({
          _id: `${item.ext}`,
          category: item.category,
          serviceName: item.desc,
          quantity: 1,
          unitPrice: item.price,
          discount: 0,
          tax: 0,
          remarks: `System generated from completed surgery on ${new Date(appt.date).toLocaleDateString()}`,
          total: item.price,
          isSystemGenerated: true,
          externalId: item.ext,
          generatedBy: `Dr. ${docName}`,
          department: item.dept,
          postedAt: appt.date
        });
      });
    }
  });

  // 5. Laboratory Charges (Completed Lab Orders)
  const labOrders = await LabOrder.find({
    patient: patientId,
    hospital: hospitalId,
    status: "completed",
    date: { $gte: stayStart, $lte: stayEnd }
  }).lean();

  const seenLabTests = new Set<string>();
  labOrders.forEach((order: any) => {
    order.tests.forEach((test: string, idx: number) => {
      const orderDateStr = new Date(order.date).toDateString();
      const uniqueKey = `${test.toLowerCase()}-${orderDateStr}`;
      if (seenLabTests.has(uniqueKey)) return;
      seenLabTests.add(uniqueKey);

      const price = getLabTestRate(test);
      pushUniqueCharge({
        _id: `sys-lab-${order._id}-${idx}`,
        category: "Laboratory Charges",
        serviceName: test,
        quantity: 1,
        unitPrice: price,
        discount: 0,
        tax: 0,
        remarks: `Automated fetch from lab results`,
        total: price,
        isSystemGenerated: true,
        externalId: `sys-lab-${order._id}-${idx}`,
        generatedBy: "Lab Technician",
        department: "Laboratory",
        postedAt: order.date
      });
    });
  });

  // 6. Radiology Charges (Completed Radiology Orders)
  const radiologyOrders = await RadiologyOrder.find({
    patient: patientId,
    hospital: hospitalId,
    status: "completed",
    date: { $gte: stayStart, $lte: stayEnd }
  }).lean();

  const seenRadiology = new Set<string>();
  radiologyOrders.forEach((order: any) => {
    const orderDateStr = new Date(order.date).toDateString();
    const uniqueKey = `${order.type.toLowerCase()}-${orderDateStr}`;
    if (seenRadiology.has(uniqueKey)) return;
    seenRadiology.add(uniqueKey);

    const price = getRadiologyRate(order.type);
    pushUniqueCharge({
      _id: `sys-rad-${order._id}`,
      category: "Radiology Charges",
      serviceName: `${order.type} Scan`,
      quantity: 1,
      unitPrice: price,
      discount: 0,
      tax: 0,
      remarks: `Automated fetch from radiology results`,
      total: price,
      isSystemGenerated: true,
      externalId: `sys-rad-${order._id}`,
      generatedBy: "Radiologist",
      department: "Radiology",
      postedAt: order.date
    });
  });

  // 7. Pharmacy Charges (Dispensed/Completed Prescriptions)
  const prescriptions = await Prescription.find({
    patient: patientId,
    hospital: hospitalId,
    status: { $in: ["Dispensed", "Completed"] },
    createdAt: { $gte: stayStart, $lte: stayEnd }
  }).lean();

  const seenPharmacy = new Set<string>();

  for (const pres of prescriptions) {
    for (const med of pres.medications) {
      const uniqueKey = `${pres._id}-${med.name.toLowerCase()}`;
      if (seenPharmacy.has(uniqueKey)) continue;
      seenPharmacy.add(uniqueKey);

      // Parse duration to estimate quantity
      let qty = 10;
      const durationNum = parseInt(med.duration);
      if (!isNaN(durationNum)) {
        qty = durationNum * 2; // e.g. twice daily
      }
      
      // Look up unitCost in InventoryItem
      const invItem = await InventoryItem.findOne({
        hospital: hospitalId,
        name: new RegExp(`^${med.name.trim()}$`, "i")
      }).lean();
      
      const rate = invItem && invItem.unitCost > 0 ? invItem.unitCost : 50;
      const invCategory = invItem?.category || "medicines";

      let finalCategory = "Pharmacy Charges";
      let finalDept = "Pharmacy";

      if (invCategory === "consumables") {
        finalCategory = "Nursing & Support";
        finalDept = "Store";
      } else if (invCategory === "equipment") {
        finalCategory = "Nursing Charges";
        finalDept = "Store";
      }

      if (invCategory === "equipment") {
        finalCategory = "Equipment Charges";
        finalDept = "Equipment Department";
      }

      const medLowerName = med.name.toLowerCase();
      if (medLowerName.includes("oxygen")) {
        finalCategory = "Nursing Charges";
        finalDept = "Oxygen Plant";
        const hours = parseInt(med.duration) || 1;
        qty = hours;
      } else if (medLowerName.includes("blood")) {
        // Automatically bill: Blood Unit, Cross Matching, Blood Processing
        pushUniqueCharge({
          _id: `sys-blood-unit-${pres._id}-${med.name}`,
          category: "Nursing Charges",
          serviceName: `Blood Unit: ${med.name}`,
          quantity: qty,
          unitPrice: rate,
          discount: 0,
          tax: 0,
          remarks: "Dispensed blood unit",
          total: qty * rate,
          isSystemGenerated: true,
          externalId: `sys-blood-unit-${pres._id}-${med.name}`,
          generatedBy: "Pharmacist",
          department: "Blood Bank",
          postedAt: pres.createdAt
        });
        pushUniqueCharge({
          _id: `sys-blood-cross-${pres._id}-${med.name}`,
          category: "Nursing Charges",
          serviceName: "Blood Cross Matching",
          quantity: 1,
          unitPrice: 500,
          discount: 0,
          tax: 0,
          remarks: "Auto generated lab procedure",
          total: 500,
          isSystemGenerated: true,
          externalId: `sys-blood-cross-${pres._id}-${med.name}`,
          generatedBy: "Pharmacist",
          department: "Blood Bank",
          postedAt: pres.createdAt
        });
        pushUniqueCharge({
          _id: `sys-blood-proc-${pres._id}-${med.name}`,
          category: "Nursing Charges",
          serviceName: "Blood Processing Fee",
          quantity: 1,
          unitPrice: 1000,
          discount: 0,
          tax: 0,
          remarks: "Auto generated blood process fee",
          total: 1000,
          isSystemGenerated: true,
          externalId: `sys-blood-proc-${pres._id}-${med.name}`,
          generatedBy: "Pharmacist",
          department: "Blood Bank",
          postedAt: pres.createdAt
        });
        continue;
      }

      pushUniqueCharge({
        _id: `sys-pharm-${pres._id}-${med.name}`,
        category: finalCategory,
        serviceName: med.name,
        quantity: qty,
        unitPrice: rate,
        discount: 0,
        tax: 0,
        remarks: `Prescribed by doctor, strength: ${med.strength}`,
        total: qty * rate,
        isSystemGenerated: true,
        externalId: `sys-pharm-${pres._id}-${med.name}`,
        generatedBy: "Pharmacist",
        department: finalDept,
        postedAt: pres.createdAt
      });
    }
  }

  return allCharges;
};

// 1. Get Active Admissions List
export const getActiveIPAdmissions = catchAsync(async (req: Request, res: Response) => {
  const search = (req.query.search as string) || "";

  let filter: Record<string, any> = {
    ...buildBranchQuery(req.hospitalFilter),
    status: { $nin: ["discharged", "Discharged", "Cancelled", "Expired", "Transferred Out (Final)"] }
  };

  if (search) {
    const searchRegex = new RegExp(search.trim(), "i");
    
    // Find patients matching search term
    const matchedPatients = await Patient.find({
      ...buildBranchQuery(req.hospitalFilter),
      $or: [
        { name: searchRegex },
        { uhid: searchRegex },
        { phone: searchRegex }
      ]
    }).select("_id");
    
    const patientIds = matchedPatients.map(p => p._id);
    
    filter.$or = [
      { admissionNumber: searchRegex },
      { ward: searchRegex },
      { patient: { $in: patientIds } }
    ];
  }

  const admissions = await Admission.find(filter)
    .populate("patient")
    .populate("room")
    .populate("bed")
    .populate("admittingDoctor", "name specialization")
    .populate("department", "name")
    .sort({ createdAt: -1 });

  res.json({
    status: "success",
    data: admissions
  });
});

// 2. Fetch IP Billing Details & Compute Live Running Bill
export const getIPAdmissionBillingDetails = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const admissionId = req.params.id;

  const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId })
    .populate("patient")
    .populate("room")
    .populate("bed")
    .populate("admittingDoctor", "name specialization")
    .populate("department", "name");

  if (!admission) {
    throw new AppError("Admission record not found.", 404);
  }

  const charges = await getIPRunningCharges(admission, hospitalId);

  // Check discharge blockers (live check)
  const blockages: string[] = [];
  const patientId = admission.patient._id || admission.patient;

  const pendingRxCount = await Prescription.countDocuments({
    patient: patientId,
    hospital: hospitalId,
    status: "Pending",
    createdAt: { $gte: admission.admissionDate }
  });
  if (pendingRxCount > 0) {
    blockages.push("Patient has pending pharmacy issues (unfulfilled prescriptions).");
  }

  const pendingLabCount = await LabOrder.countDocuments({
    patient: patientId,
    hospital: hospitalId,
    status: "pending",
    date: { $gte: admission.admissionDate }
  });
  if (pendingLabCount > 0) {
    blockages.push("Patient has pending laboratory requests.");
  }

  const pendingRadCount = await RadiologyOrder.countDocuments({
    patient: patientId,
    hospital: hospitalId,
    status: "pending",
    date: { $gte: admission.admissionDate }
  });
  if (pendingRadCount > 0) {
    blockages.push("Patient has pending radiology requests.");
  }

  // Compute Outstanding & Totals
  const gross = charges.reduce((sum, c) => sum + c.total, 0);
  const advance = admission.advanceAmount || 0;
  const outstanding = Math.max(0, gross - advance);

  res.json({
    status: "success",
    data: {
      admission,
      charges,
      blockages,
      totals: {
        gross,
        advancePaid: advance,
        currentOutstanding: outstanding
      }
    }
  });
});

// 3. Add Custom IP Charge
export const addCustomCharge = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const admissionId = req.params.id;
  const { category, serviceName, quantity, unitPrice, discount, tax, remarks } = req.body;

  const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId });
  if (!admission) {
    throw new AppError("Admission record not found.", 404);
  }

  const qty = Number(quantity) || 1;
  const price = Number(unitPrice) || 0;
  const disc = Number(discount) || 0;
  const tx = Number(tax) || 0;
  
  // Calculate total: (Qty * Price) - Discount + Tax
  const total = (qty * price) - disc + tx;

  // Duplicate custom charge protection: Check if same service posted on same day
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const duplicate = await IPCharge.findOne({
    admission: admissionId,
    hospital: hospitalId,
    serviceName: { $regex: new RegExp(`^${serviceName.trim()}$`, "i") },
    createdAt: { $gte: startOfDay }
  });

  if (duplicate) {
    throw new AppError("Duplicate custom charge for this service detected on the same date.", 400);
  }

  const ipCharge = await IPCharge.create({
    hospital: hospitalId,
    admission: admissionId,
    patient: admission.patient,
    category,
    serviceName,
    quantity: qty,
    unitPrice: price,
    discount: disc,
    tax: tx,
    remarks,
    total,
    isSystemGenerated: false,
    generatedBy: (req as any).user?.name || "Accountant",
    department: (req as any).user?.role || "Billing"
  });

  emitToHospital(hospitalId.toString(), "ip_billing_update", {
    admissionId,
    type: "CHARGE_ADDED",
    chargeId: ipCharge._id,
    timestamp: new Date()
  });

  res.status(201).json({
    status: "success",
    data: ipCharge
  });
});

// 4. Delete Custom IP Charge
export const deleteCustomCharge = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id: admissionId, chargeId } = req.params;

  const charge = await IPCharge.findOneAndDelete({
    _id: chargeId,
    admission: admissionId,
    hospital: hospitalId,
    isSystemGenerated: false // Only allow deleting custom manual charges
  });

  if (!charge) {
    throw new AppError("Charge record not found or system-generated.", 404);
  }

  emitToHospital(hospitalId.toString(), "ip_billing_update", {
    admissionId,
    type: "CHARGE_DELETED",
    chargeId,
    timestamp: new Date()
  });

  res.status(204).send();
});

// 5. Post IP Advance Payment
export const postIPAdvancePayment = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const admissionId = req.params.id;
  const { amount, paymentMethod, transactionId, type } = req.body;

  const amt = Number(amount) || 0;
  const isRefund = type === "refund";
  const adjustedAmount = isRefund ? -amt : amt;

  const admission = await Admission.findOneAndUpdate(
    { _id: admissionId, hospital: hospitalId },
    { $inc: { advanceAmount: adjustedAmount } },
    { new: true }
  );

  if (!admission) {
    throw new AppError("Admission record not found.", 404);
  }

  emitToHospital(hospitalId.toString(), "ip_billing_update", {
    admissionId,
    type: isRefund ? "REFUND_PROCESSED" : "ADVANCE_RECEIVED",
    amount: amt,
    timestamp: new Date()
  });

  res.json({
    status: "success",
    data: {
      advanceAmount: admission.advanceAmount
    }
  });
});

// 6. Generate Final IP Invoice & Discharge Patient (Transaction Safe)
export const generateFinalIPInvoice = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const admissionId = req.params.id;
  const {
    discountType,
    hospitalDiscount,
    doctorDiscount,
    managementDiscount,
    insuranceCovered,
    approvedAmount,
    claimAmount,
    patientShare,
    paymentMode,
    taxRate
  } = req.body;

  // Start Transaction session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId }).session(session);
    if (!admission) {
      throw new AppError("Admission record not found.", 404);
    }

    const patientId = admission.patient;

    // Check discharge blockers
    const blockages: string[] = [];

    // Pharmacy block check: Are there any pending prescriptions?
    const pendingRxCount = await Prescription.countDocuments({
      patient: patientId,
      hospital: hospitalId,
      status: "Pending",
      createdAt: { $gte: admission.admissionDate }
    }).session(session);

    if (pendingRxCount > 0) {
      blockages.push("Patient has pending pharmacy issues (unfulfilled prescriptions).");
    }

    // Lab block check: Are there pending lab orders?
    const pendingLabCount = await LabOrder.countDocuments({
      patient: patientId,
      hospital: hospitalId,
      status: "pending",
      date: { $gte: admission.admissionDate }
    }).session(session);

    if (pendingLabCount > 0) {
      blockages.push("Patient has pending laboratory requests.");
    }

    // Radiology block check: Are there pending radiology orders?
    const pendingRadCount = await RadiologyOrder.countDocuments({
      patient: patientId,
      hospital: hospitalId,
      status: "pending",
      date: { $gte: admission.admissionDate }
    }).session(session);

    if (pendingRadCount > 0) {
      blockages.push("Patient has pending radiology requests.");
    }

    const charges = await getIPRunningCharges(admission, hospitalId);
    const gross = charges.reduce((sum, c) => sum + c.total, 0);
    const taxVal = Number(taxRate) || 0;
    const grossTax = gross * (taxVal / 100);

    const hospitalDisc = Number(hospitalDiscount) || 0;
    const doctorDisc = Number(doctorDiscount) || 0;
    const managementDisc = Number(managementDiscount) || 0;
    const totalDiscount = hospitalDisc + doctorDisc + managementDisc;

    const insCovered = Number(insuranceCovered) || 0;
    const advance = admission.advanceAmount || 0;

    const netPayable = Math.max(0, gross + grossTax - totalDiscount - insCovered);
    const outstanding = Math.max(0, netPayable - advance);

    if (outstanding > 1) { // Accept tiny fractional rounding under 1 rupee
      blockages.push(`Patient has pending dues of ₹${outstanding.toFixed(2)}. Settlement required before discharge.`);
    }

    if (blockages.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Patient discharge blocked.",
        blockages
      });
    }

    // Map charges to invoice items
    const invoiceItems = charges.map(c => ({
      description: c.serviceName,
      category: c.category.toLowerCase().replace(" charges", ""),
      quantity: c.quantity,
      amount: c.unitPrice
    }));

    // Create Final Invoice
    const invoice = await Invoice.create([{
      hospital: hospitalId,
      patient: patientId,
      admission: admissionId,
      items: invoiceItems,
      taxRate: taxVal,
      serviceFee: 0,
      discount: totalDiscount,
      discountType: discountType || "fixed",
      hospitalDiscount: hospitalDisc,
      doctorDiscount: doctorDisc,
      managementDiscount: managementDisc,
      advancePaid: advance,
      approvedAmount: Number(approvedAmount) || 0,
      claimAmount: Number(claimAmount) || 0,
      patientShare: Number(patientShare) || 0,
      paymentMode: paymentMode || "Cash",
      insuranceCoveragePercent: netPayable > 0 ? (insCovered / (gross + grossTax)) * 100 : 0,
      billingType: "IP",
      status: "paid", // Scoped after full settlement
      totals: {
        subtotal: gross,
        taxAmount: grossTax,
        serviceFee: 0,
        discount: totalDiscount,
        insuranceCovered: insCovered,
        total: gross + grossTax - totalDiscount,
        patientBalance: 0
      }
    }], { session });

    // Mark Admission as Discharged & Release Bed
    admission.status = "Discharged";
    admission.dischargeDate = new Date();
    await admission.save({ session });

    await Bed.findOneAndUpdate(
      { _id: admission.bed, hospital: hospitalId },
      { status: "Available", isOccupied: false },
      { session }
    );

    // Commit changes
    await session.commitTransaction();
    session.endSession();

    // Emit live events to dashboards
    emitToHospital(hospitalId.toString(), "dashboard_update", {
      type: "IP_DISCHARGE_BILL",
      invoiceId: invoice[0]._id,
      patientId,
      timestamp: new Date()
    });

    emitToHospital(hospitalId.toString(), "ip_billing_update", {
      admissionId,
      type: "INVOICE_GENERATED",
      invoiceId: invoice[0]._id,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      status: "success",
      data: {
        invoice: invoice[0]
      }
    });

  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});
