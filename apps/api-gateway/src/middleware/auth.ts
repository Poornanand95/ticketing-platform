import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@ticketing/auth";
import type { Logger } from "@ticketing/logger";

export function authMiddleware(jwtSecret: string, logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        code: "MISSING_TOKEN",
      });
    }

    const token = authHeader.substring(7);

    try {
      verifyToken(token, jwtSecret);
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

