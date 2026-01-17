import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@ticketing/auth";
import type { JwtPayload } from "@ticketing/types";
import type { Logger } from "@ticketing/logger";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(
  jwtSecret: string,
  logger: Logger,
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        code: "MISSING_TOKEN",
      });
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyToken(token, jwtSecret);
      req.user = payload;
      next();
    } catch (error) {
      logger.warn({ error }, "Invalid token");
      return res.status(401).json({
        error: "Unauthorized",
        code: "INVALID_TOKEN",
      });
    }
  };
}

