import { Request, Response } from "express";
import { User } from "../models/User";
import { ROLES } from "../utils/roles";
import { ROLE_PERMISSIONS } from "../utils/rolePermissions";
import { catchAsync } from "../utils/catchAsync";

export const listRoles = catchAsync(async (req: Request, res: Response) => {
  const isHospitalScoped = req.user!.role !== "super_admin";
  const matchStage = isHospitalScoped ? { hospital: req.user!.hospital } : {};

  const counts = await User.aggregate([{ $match: matchStage }, { $group: { _id: "$role", count: { $sum: 1 } } }]);
  const countByRole = new Map(counts.map((c) => [c._id, c.count]));

  const visibleRoles = isHospitalScoped ? ROLES.filter((r) => r !== "super_admin") : ROLES;

  const roles = visibleRoles.map((role) => ({
    role,
    ...ROLE_PERMISSIONS[role],
    assignedUsers: countByRole.get(role) ?? 0,
  }));

  res.json({ status: "success", data: { roles } });
});
