import { NextFunction, Request, Response } from "express";
import { AppRole } from "../shared/types.js";
import { verifyAccessToken } from "../modules/auth/token.service.js";
import { pool } from "../db/pool.js";

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

/**
 * Middleware: requires user to have ALL listed permissions.
 * Admins bypass permission checks (full access).
 * Employees must have each permission in the employee_permissions table.
 */
export function requirePermission(permissions: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.actor) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    // Admins have full access — skip permission check
    if (req.actor.role === "admin") {
      next();
      return;
    }

    try {
      const result = await pool.query<{ permission: string }>(
        "SELECT permission FROM employee_permissions WHERE user_id = $1",
        [req.actor.id]
      );
      const userPerms = new Set(result.rows.map(r => r.permission));

      for (const perm of permissions) {
        if (!userPerms.has(perm)) {
          res.status(403).json({ success: false, error: `Missing permission: ${perm}` });
          return;
        }
      }

      next();
    } catch (err) {
      res.status(500).json({ success: false, error: "Permission check failed" });
    }
  };
}
