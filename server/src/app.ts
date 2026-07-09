import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { notFound, errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import hospitalRoutes from "./routes/hospitalRoutes";
import branchRoutes from "./routes/branchRoutes";
import departmentRoutes from "./routes/departmentRoutes";
import adminRoutes from "./routes/adminRoutes";
import roleRoutes from "./routes/roleRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import reportRoutes from "./routes/reportRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import doctorRoutes from "./routes/doctorRoutes";
import staffRoutes from "./routes/staffRoutes";
import patientRoutes from "./routes/patientRoutes";
import appointmentRoutes from "./routes/appointmentRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import "./config/cloudinary";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());
if (env.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/hospitals", hospitalRoutes);
app.use("/api/v1/branches", branchRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/admins", adminRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/doctors", doctorRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
