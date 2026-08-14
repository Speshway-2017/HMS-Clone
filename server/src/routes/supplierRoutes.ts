import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplierController";

const router = Router();

router.use(protect, scopeToHospital);

router.route("/")
  .get(restrictTo("hospital_admin", "pharmacist", "accountant"), listSuppliers)
  .post(restrictTo("hospital_admin", "pharmacist", "accountant"), createSupplier);

router.route("/:id")
  .get(restrictTo("hospital_admin", "pharmacist", "accountant"), getSupplier)
  .patch(restrictTo("hospital_admin", "pharmacist", "accountant"), updateSupplier)
  .delete(restrictTo("hospital_admin", "pharmacist", "accountant"), deleteSupplier);

export default router;
