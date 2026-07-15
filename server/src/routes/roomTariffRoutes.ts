import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listRoomTariffs,
  createRoomTariff,
  updateRoomTariff,
  deleteRoomTariff,
  getRoomTariffByWardAndType
} from "../controllers/roomTariffController";

const router = Router();

// Secure all room tariff routes
router.use(protect, scopeToHospital);

// Lookup is accessible by receptionists/accountants
router.get("/lookup", restrictTo("hospital_admin", "receptionist", "accountant"), getRoomTariffByWardAndType);

// CRUD operations are restricted to hospital admin
router.route("/")
  .get(restrictTo("hospital_admin"), listRoomTariffs)
  .post(restrictTo("hospital_admin"), createRoomTariff);

router.route("/:id")
  .patch(restrictTo("hospital_admin"), updateRoomTariff)
  .delete(restrictTo("hospital_admin"), deleteRoomTariff);

export default router;
