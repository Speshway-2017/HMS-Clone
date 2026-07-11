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

router.use(protect, restrictTo("hospital_admin", "pharmacist", "laboratory"), scopeToHospital);

router.route("/").get(listInventory).post(createInventoryItem);
router.route("/:id").get(getInventoryItem).patch(updateInventoryItem).delete(deleteInventoryItem);

export default router;
