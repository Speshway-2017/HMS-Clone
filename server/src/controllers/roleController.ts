import { Request, Response } from "express";
import { User } from "../models/User";
import { ROLES } from "../utils/roles";
import { ROLE_PERMISSIONS } from "../utils/rolePermissions";
import { catchAsync } from "../utils/catchAsync";

export const listRoles = catchAsync(async (_req: Request, res: Response) => {
  const counts = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
  const countByRole = new Map(counts.map((c) => [c._id, c.count]));

  const roles = ROLES.map((role) => ({
    role,
    ...ROLE_PERMISSIONS[role],
    assignedUsers: countByRole.get(role) ?? 0,
  }));

  res.json({ status: "success", data: { roles } });
});
