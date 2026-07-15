import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listInventory,
  createInventoryItem,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../controllers/inventoryController";

const router = Router();

router.use(protect, scopeToHospital);

router.route("/")
  .get(restrictTo("hospital_admin", "pharmacist", "laboratory", "doctor"), listInventory)
  .post(restrictTo("hospital_admin", "pharmacist", "laboratory"), createInventoryItem);

router.route("/:id")
  .get(restrictTo("hospital_admin", "pharmacist", "laboratory", "doctor"), getInventoryItem)
  .patch(restrictTo("hospital_admin", "pharmacist", "laboratory"), updateInventoryItem)
  .delete(restrictTo("hospital_admin", "pharmacist", "laboratory"), deleteInventoryItem);

export default router;
