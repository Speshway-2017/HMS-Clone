import { Request, Response } from "express";
import { z } from "zod";
import { Supplier } from "../models/Supplier";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

const supplierSchema = z.object({
  name: z
    .string({ required_error: "Please fill out this field" })
    .trim()
    .min(1, "Please fill out this field")
    .min(2, "Supplier Company Name must be at least 2 characters. Please enter valid data")
    .max(100, "Supplier Company Name cannot exceed 100 characters. Please enter valid data")
    .refine((val) => /^[a-zA-Z0-9\s\.\-/'&,()%+]+$/.test(val) && /[a-zA-Z0-9]/.test(val), {
      message: "Supplier Company Name contains invalid data. Please enter valid data",
    }),
  contactPerson: z
    .string()
    .trim()
    .max(100, "Contact Person cannot exceed 100 characters. Please enter valid data")
    .refine(
      (val) => !val || (/^[a-zA-Z\s\.\'-]+$/.test(val) && /[a-zA-Z]/.test(val)),
      { message: "Contact Person contains invalid data. Please enter valid data" }
    )
    .optional()
    .default(""),
  email: z
    .string()
    .trim()
    .max(100, "Email Address cannot exceed 100 characters. Please enter valid data")
    .refine(
      (val) => !val || (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val) && !val.includes("..")),
      { message: "Please enter a valid email address. Please enter valid data" }
    )
    .optional()
    .default(""),
  phone: z
    .string({ required_error: "Please fill out this field" })
    .trim()
    .min(1, "Please fill out this field")
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length === 10 && /^[6-9]\d{9}$/.test(digits) && !/^(\d)\1{9}$/.test(digits);
      },
      { message: "Please enter a valid 10-digit phone number. Please enter valid data" }
    ),
  address: z
    .string()
    .trim()
    .max(250, "Address cannot exceed 250 characters. Please enter valid data")
    .refine(
      (val) => !val || (!/<[^>]*>|javascript:/i.test(val) && /[a-zA-Z0-9]/.test(val)),
      { message: "Address contains invalid data. Please enter valid data" }
    )
    .optional()
    .default(""),
  outstandingBalance: z
    .coerce
    .number()
    .min(0, "Outstanding Balance cannot be negative. Please enter valid data")
    .max(10000000, "Outstanding Balance cannot exceed 10,000,000. Please enter valid data")
    .optional()
    .default(0),
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
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escaped, "i");
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
  const result = supplierSchema.safeParse(req.body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new AppError(firstIssue.message, 400);
  }
  const body = result.data;
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
  const result = supplierSchema.partial().safeParse(req.body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new AppError(firstIssue.message, 400);
  }
  const body = result.data;

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
