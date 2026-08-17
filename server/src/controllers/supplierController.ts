import { Request, Response } from "express";
import { z } from "zod";
import { Supplier } from "../models/Supplier";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  outstandingBalance: z.coerce.number().optional().default(0),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

// Helper to generate a unique supplierId like SUP-01, SUP-02...
async function generateSupplierId(hospitalFilter: Record<string, unknown>): Promise<string> {
  const count = await Supplier.countDocuments(hospitalFilter);
  const nextNum = count + 1;
  let candidate = `SUP-${String(nextNum).padStart(2, "0")}`;
  
  while (await Supplier.exists({ ...hospitalFilter, supplierId: candidate })) {
    const random = Math.floor(10 + Math.random() * 90);
    candidate = `SUP-${random}`;
  }
  return candidate;
}

export const listSuppliers = catchAsync(async (req: Request, res: Response) => {
  const { search } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { ...req.hospitalFilter };

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");
    filter.$or = [
      { name: searchRegex },
      { contactPerson: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
      { supplierId: searchRegex },
    ];
  }

  const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });

  res.json({
    status: "success",
    results: suppliers.length,
    data: { suppliers },
  });
});

export const getSupplier = catchAsync(async (req: Request, res: Response) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, ...req.hospitalFilter });
  if (!supplier) {
    throw new AppError("Supplier not found", 404);
  }
  res.json({
    status: "success",
    data: { supplier },
  });
});

export const createSupplier = catchAsync(async (req: Request, res: Response) => {
  const body = supplierSchema.parse(req.body);
  const supplierId = await generateSupplierId(req.hospitalFilter as Record<string, unknown>);

  const supplier = await Supplier.create({
    ...body,
    supplierId,
    ...req.hospitalFilter,
  });

  res.status(201).json({
    status: "success",
    data: { supplier },
  });
});

export const updateSupplier = catchAsync(async (req: Request, res: Response) => {
  const body = supplierSchema.partial().parse(req.body);

  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, ...req.hospitalFilter },
    body,
    { new: true, runValidators: true }
  );

  if (!supplier) {
    throw new AppError("Supplier not found", 404);
  }

  res.json({
    status: "success",
    data: { supplier },
  });
});

export const deleteSupplier = catchAsync(async (req: Request, res: Response) => {
  const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!supplier) {
    throw new AppError("Supplier not found", 404);
  }

  res.json({
    status: "success",
    message: "Supplier deleted successfully",
  });
});
