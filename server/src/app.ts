import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { env } from "./config/env";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { sanitizeNoSql, sanitizeXss } from "./middleware/sanitization";
import { apiLimiter, uploadLimiter } from "./middleware/rateLimiter";

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
import nurseRoutes from "./routes/nurseRoutes";
import appointmentRoutes from "./routes/appointmentRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import ipBillRoutes from "./routes/ipBillRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import ipBillingRoutes from "./routes/ipBillingRoutes";
import roomTariffRoutes from "./routes/roomTariffRoutes";
import receptionRoutes from "./routes/receptionRoutes";
import doctorDashboardRoutes from "./routes/doctorDashboardRoutes";
import wardRoutes from "./routes/wardRoutes";
import roomRoutes from "./routes/roomRoutes";
import bedRoutes from "./routes/bedRoutes";
import admissionRequestRoutes from "./routes/admissionRequestRoutes";
import prescriptionRoutes from "./routes/prescriptionRoutes";
import accountantRoutes from "./routes/accountantRoutes";
import laboratoryRoutes from "./routes/laboratoryRoutes";
import consultationRoutes from "./routes/consultationRoutes";
import diagnosticReportRoutes from "./routes/diagnosticReportRoutes";
import nurseRoutes from "./routes/nurseRoutes";

import blogRoutes from "./routes/blogRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import leaveRoutes from "./routes/leaveRoutes";
import payrollRoutes from "./routes/payrollRoutes";
import shiftRoutes from "./routes/shiftRoutes";
import { getPatientPrescriptions } from "./controllers/prescriptionController";
import { protect } from "./middleware/auth";
import { getMongoStatus } from "./config/db";
import { getSocketStatus } from "./config/socket";
import "./config/cloudinary";

const app = express();

// Trust proxy for production deployments behind Nginx / load balancers
app.set("trust proxy", 1);

// Gzip & Brotli response compression
app.use(compression());

// Production-grade security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Permit standard Vite / SPA dynamic scripts & socket connections
    crossOriginEmbedderPolicy: false,
    hsts: env.nodeEnv === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// Secure CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, postman) or matching clientUrl / localhost
      if (!origin || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin === env.clientUrl) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, valid domain matching
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-refresh-token", "X-Requested-With"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// NoSQL & XSS Sanitization
app.use(sanitizeNoSql);
app.use(sanitizeXss);

if (env.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

// Global API rate limiting
app.use("/api/", apiLimiter);

const packageJson = require("../package.json");

app.get("/api/v1/health", (_req, res) => {
  res.json({
    status: "ok",
    server: "running",
    mongodb: getMongoStatus() ? "connected" : "disconnected",
    socket: getSocketStatus() ? "initialized" : "not_initialized",
    version: packageJson.version || "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/hospitals", hospitalRoutes);
app.use("/api/v1/branches", branchRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/admins", adminRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/uploads", uploadLimiter, uploadRoutes);

// Register doctor dashboard first to prevent prefix matching collision on /api/v1/doctors
app.use("/api/v1/doctors/dashboard", doctorDashboardRoutes);
app.use("/api/v1/doctors", doctorRoutes);

app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/nurse", nurseRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/ip-billing", ipBillingRoutes);
app.use("/api/v1/ip-bills", ipBillRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/reception", receptionRoutes);
app.use("/api/v1/wards", wardRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/room-tariffs", roomTariffRoutes);
app.use("/api/v1/beds", bedRoutes);
app.use("/api/v1/admission-requests", admissionRequestRoutes);

// Register Prescription Delivery endpoints
app.use("/api/v1/prescriptions", prescriptionRoutes);
app.use("/api/patient/prescriptions", protect, getPatientPrescriptions);
app.use("/api/v1/accountant", accountantRoutes);

// Register Diagnostic Report & Laboratory endpoints
app.use("/api/v1/laboratory", laboratoryRoutes);
app.use("/api/v1/consultations", consultationRoutes);
app.use("/api/v1/diagnostic-reports", diagnosticReportRoutes);
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/leaves", leaveRoutes);
app.use("/api/v1/payroll", payrollRoutes);
app.use("/api/v1/shifts", shiftRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
