import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  listRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom
} from "../controllers/roomController";

const router = Router();

// Secure all routes
router.use(protect, restrictTo("hospital_admin", "receptionist", "nurse"), scopeToHospital);

router.route("/")
  .get(listRooms)
  .post(restrictTo("hospital_admin"), createRoom);

router.route("/:id")
  .get(getRoom)
  .patch(restrictTo("hospital_admin"), updateRoom)
  .delete(restrictTo("hospital_admin"), deleteRoom);

export default router;
