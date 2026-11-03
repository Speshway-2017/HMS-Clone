import { Schema, model, InferSchemaType, Types } from "mongoose";

export const INVENTORY_CATEGORIES = ["medicines", "equipment", "consumables"] as const;

const inventoryItemSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    strength: { type: String, default: "", trim: true, maxlength: 100 },
    sku: { type: String, required: true, trim: true, maxlength: 50 },
    category: { type: String, enum: INVENTORY_CATEGORIES, default: "medicines" },
    description: { type: String, default: "", maxlength: 500 },
    unit: { type: String, default: "units", maxlength: 50 },
    stockQty: { type: Number, default: 0, min: 0, max: 1000000 },
    reorderLevel: { type: Number, default: 0, min: 0, max: 1000000 },
    maxLevel: { type: Number, default: 0, min: 0, max: 1000000 },
    unitCost: { type: Number, default: 0, min: 0, max: 10000000 },
    supplier: { type: String, default: "", maxlength: 100 },
    storageCondition: { type: String, default: "", maxlength: 100 },
  },
  { timestamps: true },
);

export type InventoryItem = InferSchemaType<typeof inventoryItemSchema> & { _id: Types.ObjectId };
export const InventoryItem = model("InventoryItem", inventoryItemSchema);
