import { Request, Response } from "express";
import { z } from "zod";
import { InventoryItem, INVENTORY_CATEGORIES } from "../models/InventoryItem";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { emitToHospital } from "../config/socket";
import { logAudit } from "../utils/auditLogger";

const ITEM_NAME_REGEX = /^[a-zA-Z0-9\s\.\-/'&,()%+]+$/;
const SKU_REGEX = /^[a-zA-Z0-9\-_./]+$/;
const UNIT_REGEX = /^[a-zA-Z0-9\s\-_/()]+$/;
const SUPPLIER_REGEX = /^[a-zA-Z0-9\s\.\-/'&,()]+$/;
const STORAGE_REGEX = /^[a-zA-Z0-9\s\.\-°/():,]+$/;

const inventoryItemSchema = z.object({
  name: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .min(1, "Please enter valid data")
    .max(100, "Item Name cannot exceed 100 characters. Please enter valid data")
    .refine((val) => ITEM_NAME_REGEX.test(val), {
      message: "Please enter valid data",
    }),
  strength: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .max(100, "Strength cannot exceed 100 characters. Please enter valid data")
    .optional()
    .default(""),
  sku: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .min(1, "Please enter valid data")
    .max(50, "SKU cannot exceed 50 characters. Please enter valid data")
    .refine((val) => SKU_REGEX.test(val), {
      message: "Please enter valid data",
    }),
  category: z.enum(INVENTORY_CATEGORIES, {
    errorMap: () => ({ message: "Please enter valid data" }),
  }).optional(),
  description: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .max(500, "Description cannot exceed 500 characters. Please enter valid data")
    .optional()
    .default(""),
  unit: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .max(50, "Unit cannot exceed 50 characters. Please enter valid data")
    .refine((val) => !val || UNIT_REGEX.test(val), {
      message: "Please enter valid data",
    })
    .optional()
    .default("units"),
  stockQty: z.coerce
    .number({ invalid_type_error: "Please enter valid data" })
    .min(0, "Stock Quantity cannot be negative. Please enter valid data")
    .max(1000000, "Stock Quantity cannot exceed 1,000,000. Please enter valid data")
    .optional()
    .default(0),
  reorderLevel: z.coerce
    .number({ invalid_type_error: "Please enter valid data" })
    .min(0, "Reorder Level cannot be negative. Please enter valid data")
    .max(1000000, "Reorder Level cannot exceed 1,000,000. Please enter valid data")
    .optional()
    .default(0),
  maxLevel: z.coerce
    .number({ invalid_type_error: "Please enter valid data" })
    .min(0, "Max Level cannot be negative. Please enter valid data")
    .max(1000000, "Max Level cannot exceed 1,000,000. Please enter valid data")
    .optional()
    .default(0),
  unitCost: z.coerce
    .number({ invalid_type_error: "Please enter valid data" })
    .min(0, "Unit Cost cannot be negative. Please enter valid data")
    .max(10000000, "Unit Cost cannot exceed 10,000,000. Please enter valid data")
    .optional()
    .default(0),
  supplier: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .max(100, "Supplier cannot exceed 100 characters. Please enter valid data")
    .refine((val) => !val || (SUPPLIER_REGEX.test(val) && val.length >= 2), {
      message: "Please enter valid data",
    })
    .optional()
    .default(""),
  storageCondition: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .max(100, "Storage Condition cannot exceed 100 characters. Please enter valid data")
    .refine((val) => !val || STORAGE_REGEX.test(val), {
      message: "Please enter valid data",
    })
    .optional()
    .default(""),
});

function withComputedStatus(item: InstanceType<typeof InventoryItem>) {
  const obj = item.toObject();
  let stockStatus: "critical" | "low" | "optimal" = "optimal";
  if (obj.stockQty <= obj.reorderLevel) stockStatus = "critical";
  else if (obj.maxLevel > 0 && obj.stockQty <= obj.maxLevel * 0.4) stockStatus = "low";
  return { ...obj, stockStatus };
}

export const listInventory = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req, 20);
  const { category, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { ...req.hospitalFilter };
  if (category) filter.category = category;
  if (search) filter.name = new RegExp(search, "i");

  const [items, total, allForHospital] = await Promise.all([
    InventoryItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    InventoryItem.countDocuments(filter),
    InventoryItem.find(req.hospitalFilter as Record<string, unknown>),
  ]);

  const critical = allForHospital.filter((i) => i.stockQty <= i.reorderLevel).length;
  const totalValue = allForHospital.reduce((sum, i) => sum + i.stockQty * i.unitCost, 0);

  res.json({
    status: "success",
    data: items.map(withComputedStatus),
    pagination: paginatedResponse(items, total, { page, limit, skip }).pagination,
    counts: { total, critical, totalValue },
  });
});

export const createInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const body = inventoryItemSchema.parse(req.body);
  const item = await InventoryItem.create({ ...body, ...req.hospitalFilter });

  if (req.hospitalFilter?.hospital) {
    emitToHospital(req.hospitalFilter.hospital, "inventory_updated", { itemId: item._id, name: item.name });
  }

  logAudit({
    req,
    action: "CREATE_INVENTORY_ITEM",
    entity: "InventoryItem",
    entityId: item._id.toString(),
    details: { name: item.name, sku: item.sku, stockQty: item.stockQty },
  }).catch((err) => console.error("Audit log error:", err));

  res.status(201).json({ status: "success", data: { item: withComputedStatus(item) } });
});

export const getInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, ...req.hospitalFilter });
  if (!item) {
    throw new AppError("Inventory item not found.", 404);
  }
  res.json({ status: "success", data: { item: withComputedStatus(item) } });
});

export const updateInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const body = inventoryItemSchema.partial().parse(req.body);
  const item = await InventoryItem.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!item) {
    throw new AppError("Inventory item not found.", 404);
  }

  if (req.hospitalFilter?.hospital) {
    emitToHospital(req.hospitalFilter.hospital, "inventory_updated", { itemId: item._id, name: item.name });
  }

  logAudit({
    req,
    action: "UPDATE_INVENTORY_ITEM",
    entity: "InventoryItem",
    entityId: item._id.toString(),
    details: body,
  }).catch((err) => console.error("Audit log error:", err));

  res.json({ status: "success", data: { item: withComputedStatus(item) } });
});

export const deleteInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const item = await InventoryItem.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!item) {
    throw new AppError("Inventory item not found.", 404);
  }

  if (req.hospitalFilter?.hospital) {
    emitToHospital(req.hospitalFilter.hospital, "inventory_updated", { itemId: req.params.id });
  }

  logAudit({
    req,
    action: "DELETE_INVENTORY_ITEM",
    entity: "InventoryItem",
    entityId: req.params.id,
    details: { name: item.name, sku: item.sku },
  }).catch((err) => console.error("Audit log error:", err));

  res.status(204).send();
});

export const listMedicineNames = catchAsync(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { ...req.hospitalFilter, category: "medicines" };
  const { search } = req.query as Record<string, string | undefined>;
  if (search) filter.name = new RegExp(search, "i");

  const names = await InventoryItem.distinct("name", filter);
  res.json({ status: "success", data: names.sort() });
});

export const listMedicineVariants = catchAsync(async (req: Request, res: Response) => {
  const { name } = req.query as Record<string, string | undefined>;
  if (!name) {
    throw new AppError("Medicine name is required.", 400);
  }

  const filter: Record<string, unknown> = {
    ...req.hospitalFilter,
    category: "medicines",
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  };

  const items = await InventoryItem.find(filter)
    .select("name strength stockQty unitCost sku storageCondition description")
    .sort({ strength: 1 });

  res.json({
    status: "success",
    data: items.map((item) => {
      const obj = item.toObject();
      return {
        _id: obj._id,
        name: obj.name,
        strength: obj.strength || "",
        stockQty: obj.stockQty,
        unitCost: obj.unitCost,
        sku: obj.sku,
      };
    }),
  });
});
