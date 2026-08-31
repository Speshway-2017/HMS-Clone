import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { env } from "../config/env";

/**
 * Bootstraps the first super_admin from env vars when the User collection is
 * empty, so a fresh local MongoDB has a working login without running the
 * full demo seed script.
 */
export async function ensureSuperAdmin(): Promise<void> {
  const userCount = await User.estimatedDocumentCount();
  if (userCount > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(env.superAdmin.password, 10);
  await User.create({
    name: env.superAdmin.name,
    email: env.superAdmin.email,
    passwordHash,
    role: "super_admin",
    hospital: null,
  });

  console.log(`Bootstrapped super_admin account: ${env.superAdmin.email}`);
}
