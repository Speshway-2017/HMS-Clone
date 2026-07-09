import { Request, Response } from "express";
import { z } from "zod";
import { InventoryItem, INVENTORY_CATEGORIES } from "../models/InventoryItem";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";

const inventoryItemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.enum(INVENTORY_CATEGORIES).optional(),
  description: z.string().optional().default(""),
  unit: z.string().optional().default("units"),
  stockQty: z.coerce.number().min(0).optional().default(0),
  reorderLevel: z.coerce.number().min(0).optional().default(0),
  maxLevel: z.coerce.number().min(0).optional().default(0),
  unitCost: z.coerce.number().min(0).optional().default(0),
  supplier: z.string().optional().default(""),
  storageCondition: z.string().optional().default(""),
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
  const item = await InventoryItem.create({ ...body, hospital: req.hospitalFilter!.hospital });
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
  res.json({ status: "success", data: { item: withComputedStatus(item) } });
});

export const deleteInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const item = await InventoryItem.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!item) {
    throw new AppError("Inventory item not found.", 404);
  }
  res.status(204).send();
});
