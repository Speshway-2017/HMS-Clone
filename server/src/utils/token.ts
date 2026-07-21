import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "./roles";

export interface TokenPayload {
  id: string;
  role: Role;
}

export function signAccessToken(payload: TokenPayload): string {
  // Access Token — short-lived access token (e.g. 15m or configured jwtExpiresIn)
  return jwt.sign(payload, env.jwtSecret, { 
    expiresIn: (env.jwtExpiresIn || "15m") as jwt.SignOptions["expiresIn"] 
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  // Refresh Token — long-lived refresh token (7 days)
  return jwt.sign(payload, env.jwtSecret + "_refresh", { 
    expiresIn: "7d" 
  });
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret + "_refresh") as TokenPayload;
}

export function signToken(payload: TokenPayload): string {
  return signAccessToken(payload);
}
