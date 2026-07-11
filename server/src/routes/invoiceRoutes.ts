import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import { scopeToHospital } from "../middleware/scopeToHospital";
import { listInvoices, createInvoice, getInvoice, updateInvoice, deleteInvoice } from "../controllers/invoiceController";

const router = Router();

router.use(protect, restrictTo("hospital_admin", "receptionist", "accountant", "pharmacist", "manage_pharmacy"), scopeToHospital);

router.route("/").get(listInvoices).post(createInvoice);
router.route("/:id").get(getInvoice).patch(updateInvoice).delete(deleteInvoice);

export default router;
