import { NextFunction, Request, Response } from "express";
import { AppRole } from "../shared/types.js";
import { verifyAccessToken } from "../modules/auth/token.service.js";

export interface AuthRequest extends Request {
  actor?: {
    id: string;
    role: AppRole;
  };
}

export function getActorFromBearerToken(authorization?: string): AuthRequest["actor"] | null {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const decoded = verifyAccessToken(authorization.replace("Bearer ", ""));
    return { id: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}

export function requireRole(allowedRoles: AppRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authorization = req.header("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "Missing Bearer token" });
      return;
    }

    const actor = getActorFromBearerToken(authorization);
    if (!actor) {
      res.status(401).json({ success: false, error: "Invalid or expired token" });
      return;
    }

    if (!allowedRoles.includes(actor.role)) {
      res.status(403).json({ success: false, error: "Forbidden for this role" });
      return;
    }

    req.actor = actor;
    next();
  };
}
