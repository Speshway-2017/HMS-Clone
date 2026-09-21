import { Schema, model, InferSchemaType, Types } from "mongoose";

export const INVENTORY_CATEGORIES = ["medicines", "equipment", "consumables"] as const;

const inventoryItemSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    name: { type: String, required: true, trim: true },
    strength: { type: String, default: "", trim: true },
    sku: { type: String, required: true },
    category: { type: String, enum: INVENTORY_CATEGORIES, default: "medicines" },
    description: { type: String, default: "" },
    unit: { type: String, default: "units" },
    stockQty: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    maxLevel: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    supplier: { type: String, default: "" },
    storageCondition: { type: String, default: "" },
  },
  { timestamps: true },
);

export type InventoryItem = InferSchemaType<typeof inventoryItemSchema> & { _id: Types.ObjectId };
export const InventoryItem = model("InventoryItem", inventoryItemSchema);
