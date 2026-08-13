import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listInventory,
  createInventoryItem,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  listMedicineNames,
  listMedicineVariants,
} from "../controllers/inventoryController";

const router = Router();

router.use(protect, scopeToHospital);

router.get("/medicine-names", restrictTo("hospital_admin", "pharmacist", "doctor"), listMedicineNames);
router.get("/medicine-variants", restrictTo("hospital_admin", "pharmacist", "doctor"), listMedicineVariants);

router.route("/")
  .get(restrictTo("hospital_admin", "pharmacist", "laboratory", "doctor"), listInventory)
  .post(restrictTo("hospital_admin", "pharmacist", "laboratory"), createInventoryItem);

router.route("/:id")
  .get(restrictTo("hospital_admin", "pharmacist", "laboratory", "doctor"), getInventoryItem)
  .patch(restrictTo("hospital_admin", "pharmacist", "laboratory"), updateInventoryItem)
  .delete(restrictTo("hospital_admin", "pharmacist", "laboratory"), deleteInventoryItem);

export default router;

