import { Router } from "express";
import { protect } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import {
  createAdmissionRequest,
  getAdmissionRequests,
  rejectAdmissionRequest
} from "../controllers/admissionRequestController";

const router = Router();

router.use(protect, scopeToHospital);

router.route("/")
  .post(createAdmissionRequest)
  .get(getAdmissionRequests);

router.post("/:id/reject", rejectAdmissionRequest);

export default router;
