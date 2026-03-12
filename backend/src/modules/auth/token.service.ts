import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { AppRole } from "../../shared/types.js";
import { env } from "../../config/env.js";

export function signAccessToken(payload: { userId: string; role: AppRole; email: string }) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpires as jwt.SignOptions["expiresIn"] });
}

export function signRefreshToken(payload: { userId: string; role: AppRole; email: string }) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpires as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtAccessSecret) as { userId: string; role: AppRole; email: string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret) as { userId: string; role: AppRole; email: string };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
