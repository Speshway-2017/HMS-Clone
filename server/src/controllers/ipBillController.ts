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
const getIPBillItemsSummary = async (bill: any, admission: any, hospitalId: any) => {
  const patientId = admission.patient._id || admission.patient;

  // 1. Fetch manually posted bill items
  const manualItems = await IPBillItem.find({ bill: bill._id, hospital: hospitalId }).lean();
  const allItems: any[] = [...manualItems];

  // Helper to push items avoiding double entries via externalId
  const pushUniqueItem = (item: any) => {
    if (!allItems.some(x => x.externalId === item.externalId)) {
      allItems.push(item);
    }
  };

  // 2. Room stay charges
  const days = calculateStayDays(admission.admissionDate, admission.dischargeDate);
  const roomRate = getDailyWardRate(admission.ward);
  pushUniqueItem({
    category: "Room Charges",
    description: `Daily Room Rent - ${admission.ward}`,
    quantity: 1,
    days: days,
    unitPrice: roomRate,
    discount: 0,
    tax: 0,
    total: days * roomRate,
    isSystemGenerated: true,
    externalId: `sys-room-stay-${bill._id}`
  });

  pushUniqueItem({
    category: "Bed Charges",
    description: `Bed Occupancy Charges - Bed ${admission.bed?.bedNumber || "N/A"}`,
    quantity: 1,
    days: days,
    unitPrice: 200,
    discount: 0,
    tax: 0,
    total: days * 200,
    isSystemGenerated: true,
    externalId: `sys-bed-charges-${bill._id}`
  });

  // 3. Nursing Daily charges
  pushUniqueItem({
    category: "Nursing Charges",
    description: "Daily Inpatient Nursing Care & Monitoring",
    quantity: 1,
    days: days,
    unitPrice: 300,
    discount: 0,
    tax: 0,
    total: days * 300,
    isSystemGenerated: true,
    externalId: `sys-nursing-${bill._id}`
  });

  // 4. Completed Doctor Consultations during admission
  const appointments = await Appointment.find({
    patient: patientId,
    hospital: hospitalId,
    status: "completed",
    date: { $gte: admission.admissionDate }
  }).populate("doctor", "name").lean();

  appointments.forEach((appt: any) => {
    const docName = appt.doctor?.name || "Consultant Doctor";
    pushUniqueItem({
      category: "Doctor Visit Charges",
      description: `Inpatient Round Visit - Dr. ${docName}`,
      quantity: 1,
      days: 1,
      unitPrice: 500,
      discount: 0,
      tax: 0,
      total: 500,
      isSystemGenerated: true,
      externalId: `sys-appt-${appt._id}`
    });
  });

  // 5. Completed Laboratory Diagnostics since admission
  const labOrders = await LabOrder.find({
    patient: patientId,
    hospital: hospitalId,
    status: "completed",
    date: { $gte: admission.admissionDate }
  }).lean();

  labOrders.forEach((order: any) => {
    order.tests.forEach((test: string, idx: number) => {
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
        externalId: `sys-lab-${order._id}-${idx}`
      });
    });
  });

  // 6. Completed Radiology Scans since admission
  const radiologyOrders = await RadiologyOrder.find({
    patient: patientId,
    hospital: hospitalId,
    status: "completed",
    date: { $gte: admission.admissionDate }
  }).lean();

  radiologyOrders.forEach((order: any) => {
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
      externalId: `sys-rad-${order._id}`
    });
  });

  // 7. Pharmacy medicines dispensed during stay
  const prescriptions = await Prescription.find({
    patient: patientId,
    hospital: hospitalId,
    status: { $in: ["Dispensed", "Completed"] },
    createdAt: { $gte: admission.admissionDate }
  }).lean();

  for (const pres of prescriptions) {
    for (const med of pres.medications) {
      let qty = 10;
      const durationNum = parseInt(med.duration);
      if (!isNaN(durationNum)) {
        qty = durationNum * 2;
      }

      // Lookup unitCost in InventoryItem
      const invItem = await InventoryItem.findOne({
        hospital: hospitalId,
        name: new RegExp(`^${med.name.trim()}$`, "i"),
        category: "medicines"
      }).lean();

      const rate = invItem && invItem.unitCost > 0 ? invItem.unitCost : 50;

      pushUniqueItem({
        category: "Pharmacy Charges",
        description: `Medication: ${med.name} (${med.strength || "Standard"})`,
        quantity: qty,
        days: 1,
        unitPrice: rate,
        discount: 0,
        tax: 0,
        total: qty * rate,
        isSystemGenerated: true,
        externalId: `sys-pharm-${pres._id}-${med.name}`
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
    isSystemGenerated: false
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
