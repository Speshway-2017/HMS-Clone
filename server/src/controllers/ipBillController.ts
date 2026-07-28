import { Request, Response } from "express";
import mongoose from "mongoose";
import { Admission } from "../models/Admission";
import { Patient } from "../models/Patient";
import { LabOrder } from "../models/LabOrder";
import { RadiologyOrder } from "../models/RadiologyOrder";
import { Prescription } from "../models/Prescription";
import { Appointment } from "../models/Appointment";
import { InventoryItem } from "../models/InventoryItem";
import { IPBill } from "../models/IPBill";
import { IPBillItem } from "../models/IPBillItem";
import { IPBillPayment } from "../models/IPBillPayment";
import { IPBillReceipt } from "../models/IPBillReceipt";
import { Bed } from "../models/Bed";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { emitToHospital } from "../config/socket";

// Helper: Calculate stay duration in days (minimum 1 day)
const calculateStayDays = (admissionDate: Date, dischargeDate?: Date | null): number => {
  const start = new Date(admissionDate);
  const end = dischargeDate ? new Date(dischargeDate) : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
};

// Helper: Standard rates for Bed/Ward categories
const getDailyWardRate = (wardType: string): number => {
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

// Helper: Standard rates for Radiology Scans
const getRadiologyRate = (scanType: string): number => {
  const type = scanType.toLowerCase();
  if (type.includes("x-ray") || type.includes("xray")) return 500;
  if (type.includes("ct")) return 3000;
  if (type.includes("mri")) return 6000;
  if (type.includes("ultrasound") || type.includes("usg")) return 1200;
  return 800;
};

// Helper: Get Consolidated Inpatient Bill Items (Manual + Auto-Fetched)
export const getIPBillItemsSummary = async (bill: any, admission: any, hospitalId: any) => {
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

  // 1. Fetch manually posted bill items
  const manualItems = await IPBillItem.find({ bill: bill._id, hospital: hospitalId }).lean();
  const allItems: any[] = [];

  // Define date limits safely to handle midnight/timezone mismatches
  const stayStart = new Date(admission.admissionDate);
  stayStart.setHours(0, 0, 0, 0);
  stayStart.setDate(stayStart.getDate() - 1);

  const stayEnd = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
  stayEnd.setHours(23, 59, 59, 999);

  // Helper to push items ensuring uniqueness
  const pushUniqueItem = (item: any) => {
    if (!allItems.some(x => x.externalId === item.externalId)) {
      allItems.push({
        ...item,
        generatedBy: item.generatedBy || "System",
        department: item.department || "Billing",
        postedAt: item.postedAt || new Date()
      });
    }
  };

  // Add manual items first
  manualItems.forEach((item: any) => {
    pushUniqueItem({
      ...item,
      externalId: item.externalId || `manual-${item._id}`
    });
  });

  // 2. Accommodation charges and Nursing daily charges from history
  if (admission.accommodationHistory && admission.accommodationHistory.length > 0) {
    admission.accommodationHistory.forEach((historyEntry: any, index: number) => {
      const entryDays = calculateStayDays(
        historyEntry.startDate,
        historyEntry.endDate || new Date()
      );
      
      // Accommodation Rent
      pushUniqueItem({
        category: "Accommodation Charges",
        description: `Accommodation Rent: ${historyEntry.ward} (${historyEntry.roomType || "Non AC"}) - Room ${historyEntry.room?.roomNumber || "N/A"}, Bed ${historyEntry.bed?.bedNumber || "N/A"}`,
        quantity: 1,
        days: entryDays,
        unitPrice: historyEntry.dailyTariff,
        discount: 0,
        tax: 0,
        total: entryDays * historyEntry.dailyTariff,
        isSystemGenerated: true,
        externalId: `sys-accommodation-${historyEntry._id || index}-${bill._id}`,
        generatedBy: "System",
        department: "Admission",
        postedAt: historyEntry.startDate
      });

      // Nursing Daily Package for this stay period
      const nursingRate = historyEntry.nursingTariff !== undefined ? historyEntry.nursingTariff : 300;
      pushUniqueItem({
        category: "Nursing Charges",
        description: `Daily Inpatient Nursing Package - ${historyEntry.ward}`,
        quantity: 1,
        days: entryDays,
        unitPrice: nursingRate,
        discount: 0,
        tax: 0,
        total: entryDays * nursingRate,
        isSystemGenerated: true,
        externalId: `sys-nursing-${historyEntry._id || index}-${bill._id}`,
        generatedBy: "System",
        department: "Nursing",
        postedAt: historyEntry.startDate
      });
    });
  } else {
    // Fallback for legacy admissions
    const days = calculateStayDays(admission.admissionDate, admission.dischargeDate);
    const roomRate = getDailyWardRate(admission.ward);
    
    pushUniqueItem({
      category: "Accommodation Charges",
      description: `Accommodation Rent (Legacy Fallback) - ${admission.ward} - Room ${admission.room?.roomNumber || "N/A"}, Bed ${admission.bed?.bedNumber || "N/A"}`,
      quantity: 1,
      days: days,
      unitPrice: roomRate,
      discount: 0,
      tax: 0,
      total: days * roomRate,
      isSystemGenerated: true,
      externalId: `sys-accommodation-fallback-${bill._id}`,
      generatedBy: "System",
      department: "Admission",
      postedAt: admission.admissionDate
    });

    pushUniqueItem({
      category: "Nursing Charges",
      description: "Daily Inpatient Nursing Care & Monitoring (Legacy Fallback)",
      quantity: 1,
      days: days,
      unitPrice: 300,
      discount: 0,
      tax: 0,
      total: days * 300,
      isSystemGenerated: true,
      externalId: `sys-nursing-fallback-${bill._id}`,
      generatedBy: "System",
      department: "Nursing",
      postedAt: admission.admissionDate
    });
  }

  // 4. Completed Doctor Consultations / Visits during stay
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
      
      pushUniqueItem({
        category: "Doctor Visit Charges",
        description: `Inpatient Round Visit - Dr. ${docName}`,
        quantity: 1,
        days: 1,
        unitPrice: fee,
        discount: 0,
        tax: 0,
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

      pushUniqueItem({
        category: "Procedure Charges",
        description: `Inpatient Clinical Procedure: ${procName} - Dr. ${docName}`,
        quantity: 1,
        days: 1,
        unitPrice: 3500,
        discount: 0,
        tax: 0,
        total: 3500,
        isSystemGenerated: true,
        externalId: `sys-proc-${appt._id}`,
        generatedBy: `Dr. ${docName}`,
        department: "Clinical Procedures",
        postedAt: appt.date
      });
    } else if (apptType === "Surgery") {
      const surgItems = [
        { category: "Operation Charges", desc: `Surgeon Fee (Surgery) - Dr. ${docName}`, price: 12000, ext: `sys-surg-fee-${appt._id}`, dept: "Surgery" },
        { category: "Operation Charges", desc: "Assistant Surgeon Fee", price: 4000, ext: `sys-surg-ast-${appt._id}`, dept: "Surgery" },
        { category: "Operation Charges", desc: "Anaesthetist Fee", price: 6000, ext: `sys-surg-anes-${appt._id}`, dept: "Surgery" },
        { category: "Operation Charges", desc: "OT Theater & Maintenance Charges", price: 15000, ext: `sys-surg-ot-${appt._id}`, dept: "Operation Theatre" },
        { category: "Consumables", desc: "OT Specialized Consumables & Kits", price: 4500, ext: `sys-surg-con-${appt._id}`, dept: "Store" },
        { category: "Medical Equipment", desc: "OT Monitoring & Life Support Equipment Rent", price: 3000, ext: `sys-surg-eq-${appt._id}`, dept: "Equipment" },
        { category: "Miscellaneous Charges", desc: "Post-Operative Recovery Ward Monitoring", price: 2500, ext: `sys-surg-rec-${appt._id}`, dept: "Recovery" }
      ];

      surgItems.forEach(item => {
        pushUniqueItem({
          category: item.category,
          description: item.desc,
          quantity: 1,
          days: 1,
          unitPrice: item.price,
          discount: 0,
          tax: 0,
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

  // 5. Completed Laboratory Diagnostics since admission
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
      pushUniqueItem({
        category: "Laboratory Charges",
        description: `Pathology Test: ${test}`,
        quantity: 1,
        days: 1,
        unitPrice: price,
        discount: 0,
        tax: 0,
        total: price,
        isSystemGenerated: true,
        externalId: `sys-lab-${order._id}-${idx}`,
        generatedBy: "Lab Technician",
        department: "Laboratory",
        postedAt: order.date
      });
    });
  });

  // 6. Completed Radiology Scans since admission
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
    pushUniqueItem({
      category: "Radiology Charges",
      description: `Diagnostic Imaging: ${order.type}`,
      quantity: 1,
      days: 1,
      unitPrice: price,
      discount: 0,
      tax: 0,
      total: price,
      isSystemGenerated: true,
      externalId: `sys-rad-${order._id}`,
      generatedBy: "Radiologist",
      department: "Radiology",
      postedAt: order.date
    });
  });

  // 7. Pharmacy medicines dispensed during stay
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

      let qty = 10;
      const durationNum = parseInt(med.duration);
      if (!isNaN(durationNum)) {
        qty = durationNum * 2;
      }

      // Lookup unitCost in InventoryItem
      const invItem = await InventoryItem.findOne({
        hospital: hospitalId,
        name: new RegExp(`^${med.name.trim()}$`, "i")
      }).lean();

      const rate = invItem && invItem.unitCost > 0 ? invItem.unitCost : 50;
      const invCategory = invItem?.category || "medicines";

      let finalCategory = "Pharmacy Charges";
      let finalDept = "Pharmacy";

      if (invCategory === "consumables") {
        finalCategory = "Consumables";
        finalDept = "Store";
      } else if (invCategory === "equipment") {
        finalCategory = "Medical Equipment";
        finalDept = "Equipment Department";
      }

      // Special cases: Oxygen and Blood
      const medLowerName = med.name.toLowerCase();
      if (medLowerName.includes("oxygen")) {
        finalCategory = "Oxygen Charges";
        finalDept = "Oxygen Plant";
        const hours = parseInt(med.duration) || 1;
        qty = hours;
      } else if (medLowerName.includes("blood")) {
        // Automatically bill: Blood Unit, Cross Matching, Blood Processing
        pushUniqueItem({
          category: "Blood Charges",
          description: `Blood Unit: ${med.name}`,
          quantity: qty,
          days: 1,
          unitPrice: rate,
          discount: 0,
          tax: 0,
          total: qty * rate,
          isSystemGenerated: true,
          externalId: `sys-blood-unit-${pres._id}-${med.name}`,
          generatedBy: "Pharmacist",
          department: "Blood Bank",
          postedAt: pres.createdAt
        });
        pushUniqueItem({
          category: "Blood Charges",
          description: "Blood Cross Matching",
          quantity: 1,
          days: 1,
          unitPrice: 500,
          discount: 0,
          tax: 0,
          total: 500,
          isSystemGenerated: true,
          externalId: `sys-blood-cross-${pres._id}-${med.name}`,
          generatedBy: "Pharmacist",
          department: "Blood Bank",
          postedAt: pres.createdAt
        });
        pushUniqueItem({
          category: "Blood Charges",
          description: "Blood Processing Fee",
          quantity: 1,
          days: 1,
          unitPrice: 1000,
          discount: 0,
          tax: 0,
          total: 1000,
          isSystemGenerated: true,
          externalId: `sys-blood-proc-${pres._id}-${med.name}`,
          generatedBy: "Pharmacist",
          department: "Blood Bank",
          postedAt: pres.createdAt
        });
        continue;
      }

      pushUniqueItem({
        category: finalCategory,
        description: `Medication/Item: ${med.name} (${med.strength || "Standard"})`,
        quantity: qty,
        days: 1,
        unitPrice: rate,
        discount: 0,
        tax: 0,
        total: qty * rate,
        isSystemGenerated: true,
        externalId: `sys-pharm-${pres._id}-${med.name}`,
        generatedBy: "Pharmacist",
        department: finalDept,
        postedAt: pres.createdAt
      });
    }
  }

  return allItems;
};

// 1. Search Currently Admitted Inpatients
export const getActiveAdmittedPatients = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const search = (req.query.search as string) || "";

  let filter: Record<string, any> = {
    hospital: hospitalId,
    status: { $nin: ["discharged", "Discharged", "Cancelled", "Expired", "Transferred Out (Final)"] }
  };

  if (search) {
    const searchRegex = new RegExp(search.trim(), "i");
    
    const matchedPatients = await Patient.find({
      hospital: hospitalId,
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

// 2. Create IP Bill Draft
export const createIPBill = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { admissionId } = req.body;

  const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId }).populate("patient");
  if (!admission) {
    throw new AppError("Admission record not found.", 404);
  }

  // Duplicate Check: Only ONE active IP bill can exist per admission
  const existingBill = await IPBill.findOne({
    admission: admissionId,
    hospital: hospitalId,
    status: { $in: ["Draft", "Generated"] }
  });

  if (existingBill) {
    return res.status(200).json({
      status: "success",
      message: "Active bill already exists for this admission.",
      data: {
        bill: existingBill
      }
    });
  }

  // Check if patient is already discharged
  if (admission.status === "Discharged" || admission.status === "discharged") {
    throw new AppError("Cannot create a bill for a discharged patient.", 400);
  }

  const suffix = Date.now().toString().slice(-6);
  const billNumber = `BILL-IP-${suffix}`;
  const invoiceNumber = `INV-IP-${suffix}`;

  const bill = await IPBill.create({
    hospital: hospitalId,
    admission: admissionId,
    patient: admission.patient._id,
    billNumber,
    invoiceNumber,
    billingDate: new Date(),
    status: "Draft",
    advancePaid: admission.advanceAmount || 0,
    createdBy: req.user!._id
  });

  emitToHospital(hospitalId.toString(), "ip_bill_update", {
    admissionId,
    type: "BILL_CREATED",
    billId: bill._id,
    timestamp: new Date()
  });

  res.status(201).json({
    status: "success",
    data: {
      bill
    }
  });
});

// 3. Fetch Inpatient Bill Details with Running Aggregation
export const getIPBillDetails = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const admissionId = req.params.admissionId;

  const admission = await Admission.findOne({ _id: admissionId, hospital: hospitalId })
    .populate("patient")
    .populate("room")
    .populate("bed")
    .populate("admittingDoctor", "name specialization")
    .populate("assignedNurse", "name role")
    .populate("department", "name");

  if (!admission) {
    throw new AppError("Admission record not found.", 404);
  }

  const bill = await IPBill.findOne({
    admission: admissionId,
    hospital: hospitalId,
    status: { $ne: "Cancelled" }
  });

  if (!bill) {
    return res.json({
      status: "success",
      data: {
        bill: null
      }
    });
  }

  const items = await getIPBillItemsSummary(bill, admission, hospitalId);

  // Calculate live summary
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * (bill.taxRate / 100);
  const totalDiscount = bill.discountType === "percentage"
    ? subtotal * ((bill.hospitalDiscount + bill.doctorDiscount + bill.managementDiscount) / 100)
    : (bill.hospitalDiscount + bill.doctorDiscount + bill.managementDiscount);

  const grandTotal = subtotal + tax - totalDiscount;
  const outstanding = Math.max(0, grandTotal - bill.insuranceCovered - bill.advancePaid);

  res.json({
    status: "success",
    data: {
      bill,
      items,
      totals: {
        subtotal,
        taxAmount: tax,
        discount: totalDiscount,
        grandTotal,
        outstanding
      }
    }
  });
});

// 4. Add Manual Charge Item to Bill
export const addBillChargeItem = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const billId = req.params.id;
  const { category, description, quantity, days, unitPrice, discount, tax } = req.body;

  const bill = await IPBill.findOne({ _id: billId, hospital: hospitalId });
  if (!bill) {
    throw new AppError("Active bill record not found.", 404);
  }

  if (bill.status === "Paid") {
    throw new AppError("Cannot edit a paid bill.", 400);
  }

  const qty = Number(quantity) || 1;
  const d = Number(days) || 1;
  const price = Number(unitPrice) || 0;
  const disc = Number(discount) || 0;
  const tx = Number(tax) || 0;

  // Total: (Qty * Days * Price) - Discount + Tax
  const total = (qty * d * price) - disc + tx;

  // Prevent duplicate bill items
  const duplicate = await IPBillItem.findOne({
    bill: billId,
    hospital: hospitalId,
    description: { $regex: new RegExp(`^${description.trim()}$`, "i") }
  });

  if (duplicate) {
    throw new AppError("Duplicate bill item with the same description already exists.", 400);
  }

  const billItem = await IPBillItem.create({
    hospital: hospitalId,
    bill: billId,
    category,
    description,
    quantity: qty,
    days: d,
    unitPrice: price,
    discount: disc,
    tax: tx,
    total,
    isSystemGenerated: false,
    generatedBy: (req as any).user?.name || "Receptionist",
    department: (req as any).user?.role || "Billing"
  });

  // Recalculate bill outstanding
  const allItems = await IPBillItem.find({ bill: billId, hospital: hospitalId });
  const subtotal = allItems.reduce((sum, item) => sum + item.total, 0);
  const taxVal = subtotal * (bill.taxRate / 100);
  const totalDiscount = bill.discountType === "percentage"
    ? subtotal * ((bill.hospitalDiscount + bill.doctorDiscount + bill.managementDiscount) / 100)
    : (bill.hospitalDiscount + bill.doctorDiscount + bill.managementDiscount);

  bill.grandTotal = subtotal + taxVal - totalDiscount;
  bill.outstanding = Math.max(0, bill.grandTotal - bill.insuranceCovered - bill.advancePaid);
  bill.updatedBy = req.user!._id;
  await bill.save();

  emitToHospital(hospitalId.toString(), "ip_bill_update", {
    admissionId: bill.admission,
    type: "CHARGE_ADDED",
    itemId: billItem._id,
    timestamp: new Date()
  });

  res.status(201).json({
    status: "success",
    data: billItem
  });
});

// 5. Update Manual Charge Item
export const updateBillChargeItem = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id: billId, itemId } = req.params;
  const { quantity, days, unitPrice, discount, tax } = req.body;

  const bill = await IPBill.findOne({ _id: billId, hospital: hospitalId });
  if (!bill) {
    throw new AppError("Bill record not found.", 404);
  }

  if (bill.status === "Paid") {
    throw new AppError("Cannot edit a paid bill.", 400);
  }

  const billItem = await IPBillItem.findOne({ _id: itemId, bill: billId, hospital: hospitalId, isSystemGenerated: false });
  if (!billItem) {
    throw new AppError("Manual bill item not found.", 404);
  }

  const qty = Number(quantity) || 1;
  const d = Number(days) || 1;
  const price = Number(unitPrice) || 0;
  const disc = Number(discount) || 0;
  const tx = Number(tax) || 0;

  billItem.quantity = qty;
  billItem.days = d;
  billItem.unitPrice = price;
  billItem.discount = disc;
  billItem.tax = tx;
  billItem.total = (qty * d * price) - disc + tx;
  await billItem.save();

  // Recalculate bill
  const allItems = await IPBillItem.find({ bill: billId, hospital: hospitalId });
  const subtotal = allItems.reduce((sum, item) => sum + item.total, 0);
  const taxVal = subtotal * (bill.taxRate / 100);
  const totalDiscount = bill.discountType === "percentage"
    ? subtotal * ((bill.hospitalDiscount + bill.doctorDiscount + bill.managementDiscount) / 100)
    : (bill.hospitalDiscount + bill.doctorDiscount + bill.managementDiscount);

  bill.grandTotal = subtotal + taxVal - totalDiscount;
  bill.outstanding = Math.max(0, bill.grandTotal - bill.insuranceCovered - bill.advancePaid);
  bill.updatedBy = req.user!._id;
  await bill.save();

  emitToHospital(hospitalId.toString(), "ip_bill_update", {
    admissionId: bill.admission,
    type: "CHARGE_UPDATED",
    itemId,
    timestamp: new Date()
  });

  res.json({
    status: "success",
    data: billItem
  });
});

// 6. Delete Manual Charge Item
export const deleteBillChargeItem = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id: billId, itemId } = req.params;

  const bill = await IPBill.findOne({ _id: billId, hospital: hospitalId });
  if (!bill) {
    throw new AppError("Bill record not found.", 404);
  }

  if (bill.status === "Paid") {
    throw new AppError("Cannot edit a paid bill.", 400);
  }

  const billItem = await IPBillItem.findOneAndDelete({ _id: itemId, bill: billId, hospital: hospitalId, isSystemGenerated: false });
  if (!billItem) {
    throw new AppError("Manual bill item not found.", 404);
  }

  // Recalculate bill
  const allItems = await IPBillItem.find({ bill: billId, hospital: hospitalId });
  const subtotal = allItems.reduce((sum, item) => sum + item.total, 0);
  const taxVal = subtotal * (bill.taxRate / 100);
  const totalDiscount = bill.discountType === "percentage"
    ? subtotal * ((bill.hospitalDiscount + bill.doctorDiscount + bill.managementDiscount) / 100)
    : (bill.hospitalDiscount + bill.doctorDiscount + bill.managementDiscount);

  bill.grandTotal = subtotal + taxVal - totalDiscount;
  bill.outstanding = Math.max(0, bill.grandTotal - bill.insuranceCovered - bill.advancePaid);
  bill.updatedBy = req.user!._id;
  await bill.save();

  emitToHospital(hospitalId.toString(), "ip_bill_update", {
    admissionId: bill.admission,
    type: "CHARGE_DELETED",
    itemId,
    timestamp: new Date()
  });

  res.status(204).send();
});

// 7. Generate Invoice (Locks Bill status to Generated)
export const generateIPBillInvoice = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const billId = req.params.id;
  const {
    discountType,
    hospitalDiscount,
    doctorDiscount,
    managementDiscount,
    approvedAmount,
    claimAmount,
    patientShare,
    paymentMode,
    taxRate
  } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await IPBill.findOne({ _id: billId, hospital: hospitalId }).session(session);
    if (!bill) {
      throw new AppError("Bill record not found.", 404);
    }

    if (bill.status === "Paid" || bill.status === "Generated") {
      throw new AppError("Cannot edit/re-generate locked invoice.", 400);
    }

    const admission = await Admission.findOne({ _id: bill.admission, hospital: hospitalId }).session(session);
    if (!admission) {
      throw new AppError("Linked admission record not found.", 404);
    }

    // Pull dynamic stays & diagnostic orders to lock them permanently into IPBillItem collection
    const consolidatedItems = await getIPBillItemsSummary(bill, admission, hospitalId);
    
    if (consolidatedItems.length === 0) {
      throw new AppError("Cannot generate invoice for a bill with zero items.", 400);
    }

    // Write all system-generated items to IPBillItem collection under the session
    const sysItems = consolidatedItems.filter(item => item.isSystemGenerated);
    for (const sys of sysItems) {
      await IPBillItem.create([{
        hospital: hospitalId,
        bill: bill._id,
        category: sys.category,
        description: sys.description,
        quantity: sys.quantity,
        days: sys.days,
        unitPrice: sys.unitPrice,
        discount: sys.discount,
        tax: sys.tax,
        total: sys.total,
        isSystemGenerated: true,
        externalId: sys.externalId
      }], { session });
    }

    // Lock calculations into IPBill fields
    const allItems = await IPBillItem.find({ bill: bill._id, hospital: hospitalId }).session(session);
    const subtotal = allItems.reduce((sum, item) => sum + item.total, 0);
    
    const taxVal = Number(taxRate) || 5;
    const grossTax = subtotal * (taxVal / 100);

    const hospD = Number(hospitalDiscount) || 0;
    const docD = Number(doctorDiscount) || 0;
    const mgmtD = Number(managementDiscount) || 0;
    const totalD = discountType === "percentage"
      ? subtotal * ((hospD + docD + mgmtD) / 100)
      : (hospD + docD + mgmtD);

    const insCovered = paymentMode !== "Cash" ? (Number(approvedAmount) || 0) : 0;
    const grandTotal = subtotal + grossTax - totalD;
    const outstanding = Math.max(0, grandTotal - insCovered - bill.advancePaid);

    bill.status = "Generated";
    bill.taxRate = taxVal;
    bill.discountType = discountType || "fixed";
    bill.hospitalDiscount = hospD;
    bill.doctorDiscount = docD;
    bill.managementDiscount = mgmtD;
    bill.approvedAmount = Number(approvedAmount) || 0;
    bill.claimAmount = Number(claimAmount) || 0;
    bill.patientShare = Number(patientShare) || 0;
    bill.insuranceCovered = insCovered;
    bill.paymentMode = paymentMode || "Cash";
    bill.grandTotal = grandTotal;
    bill.outstanding = outstanding;
    bill.generatedBy = req.user!._id;
    
    await bill.save({ session });

    await session.commitTransaction();
    session.endSession();

    emitToHospital(hospitalId.toString(), "ip_bill_update", {
      admissionId: bill.admission,
      type: "BILL_INVOICE_GENERATED",
      billId: bill._id,
      timestamp: new Date()
    });

    res.json({
      status: "success",
      data: {
        bill
      }
    });

  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// 8. Process IP Bill Payment and Issue Receipt (Transaction Safe)
export const postIPBillPayment = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const billId = req.params.id;
  const { amount, paymentMethod, mixedDetails, transactionId } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await IPBill.findOne({ _id: billId, hospital: hospitalId }).session(session);
    if (!bill) {
      throw new AppError("Bill record not found.", 404);
    }

    if (bill.status === "Paid") {
      throw new AppError("This bill has already been fully paid.", 400);
    }

    const amt = Number(amount) || 0;
    const finalAdvance = bill.advancePaid + amt;
    const outstanding = Math.max(0, bill.grandTotal - bill.insuranceCovered - finalAdvance);

    bill.advancePaid = finalAdvance;
    bill.outstanding = outstanding;

    if (outstanding <= 1) {
      bill.status = "Paid";
      bill.paidBy = req.user!._id;

      // Discharge validator: check pending dues settled. Release Bed/Admission status
      const admission = await Admission.findOne({ _id: bill.admission, hospital: hospitalId }).session(session);
      if (admission) {
        admission.status = "Discharged";
        admission.dischargeDate = new Date();
        await admission.save({ session });

        await Bed.findOneAndUpdate(
          { _id: admission.bed, hospital: hospitalId },
          { status: "Available", isOccupied: false },
          { session }
        );
      }
    }

    await bill.save({ session });

    // Create Inpatient Bill Payment Record
    const payment = await IPBillPayment.create([{
      hospital: hospitalId,
      bill: billId,
      patient: bill.patient,
      amount: amt,
      paymentMethod,
      mixedDetails,
      transactionId: transactionId || `TXN-IP-${Date.now().toString().slice(-6)}`,
      paidBy: req.user!._id
    }], { session });

    // Generate Printable Inpatient Receipt
    const receiptNumber = `RCP-IP-${Date.now().toString().slice(-6)}`;
    const receipt = await IPBillReceipt.create([{
      hospital: hospitalId,
      bill: billId,
      payment: payment[0]._id,
      receiptNumber,
      paymentMode: paymentMethod,
      amount: amt,
      collectedBy: req.user!._id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    emitToHospital(hospitalId.toString(), "ip_bill_update", {
      admissionId: bill.admission,
      type: "BILL_PAYMENT_PROCESSED",
      billId: bill._id,
      paymentId: payment[0]._id,
      receiptNumber,
      timestamp: new Date()
    });

    res.status(201).json({
      status: "success",
      data: {
        payment: payment[0],
        receipt: receipt[0],
        bill
      }
    });

  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// 9. Fetch IP Bill Receipt Print Details
export const getIPBillReceiptDetails = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id: billId, paymentId } = req.params;

  const receipt = await IPBillReceipt.findOne({ bill: billId, payment: paymentId, hospital: hospitalId })
    .populate({
      path: "bill",
      populate: { path: "patient admission" }
    })
    .populate("payment")
    .populate("collectedBy", "name");

  if (!receipt) {
    throw new AppError("Receipt record not found.", 404);
  }

  res.json({
    status: "success",
    data: receipt
  });
});
