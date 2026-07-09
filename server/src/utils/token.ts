import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "./roles";

export interface TokenPayload {
  id: string;
  role: Role;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}
