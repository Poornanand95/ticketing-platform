import { Response, NextFunction } from "express";
import { hasRole, hasAnyRole } from "@ticketing/auth";
import type { AuthRequest } from "./auth.js";

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        code: "MISSING_USER",
      });
    }

    if (!hasRole(req.user.roles, role)) {
      return res.status(403).json({
        error: "Forbidden",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    next();
  };
}

export function requireAnyRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        code: "MISSING_USER",
      });
    }

    if (!hasAnyRole(req.user.roles, roles)) {
      return res.status(403).json({
        error: "Forbidden",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    next();
  };
}

