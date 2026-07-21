import { Request } from "express";
import { AuditLog } from "../models/AuditLog";
import { emitToHospital } from "../config/socket";

interface AuditLogOptions {
  req?: Request;
  hospitalId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
}

export async function logAudit(options: AuditLogOptions) {
  try {
    const hospital = options.hospitalId || (options.req?.user?.hospital ? options.req.user.hospital.toString() : null);
    const user = options.userId || (options.req?.user?._id ? options.req.user._id.toString() : null);
    const userEmail = options.userEmail || options.req?.user?.email || "system";
    const userRole = options.userRole || options.req?.user?.role || "system";
    const ipAddress = options.req?.ip || options.req?.socket?.remoteAddress || "";
    const userAgent = options.req?.get("user-agent") || "";

    const logEntry = await AuditLog.create({
      hospital,
      user,
      userEmail,
      userRole,
      action: options.action,
      entity: options.entity,
      entityId: options.entityId || "",
      details: options.details || {},
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });

    if (hospital) {
      emitToHospital(hospital, "audit_log_created", {
        id: logEntry._id,
        action: options.action,
        entity: options.entity,
        userEmail,
        timestamp: logEntry.timestamp,
      });
    }

    return logEntry;
  } catch (error) {
    console.error("Audit log creation error:", error);
    return null;
  }
}
