import { Request, Response, NextFunction } from "express";
import { decodeToken } from "@ticketing/auth";
import type { JwtPayload } from "@ticketing/types";

export interface OrgRequest extends Request {
  orgId?: string;
  userId?: string;
  user?: JwtPayload;
}

export function orgContextMiddleware(jwtSecret: string) {
  return (req: OrgRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = decodeToken(token);

      if (payload) {
        req.orgId = payload.org_id;
        req.userId = payload.user_id;
        req.user = payload;
      }
    }

    // Support system requests via X-Org-Id header (for automation service, etc.)
    if (!req.orgId && req.headers["x-org-id"]) {
      req.orgId = req.headers["x-org-id"] as string;
      req.userId = (req.headers["x-user-id"] as string) || "system";
    }

    next();
  };
}

