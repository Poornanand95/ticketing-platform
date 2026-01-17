import { Router, Request, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { AuthService } from "../services/auth.service.js";

export default function authRoutes(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
) {
  const router = Router();
  const authService = new AuthService(db, config, logger);

  router.post("/login", async (req: Request, res: Response) => {
    // Check if request was aborted
    if (req.aborted) {
      return;
    }

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required",
          code: "VALIDATION_ERROR",
        });
      }

      const result = await authService.login(email, password);
      
      // Check again before sending response
      if (req.aborted || res.headersSent) {
        return;
      }
      
      res.json(result);
    } catch (error) {
      // Don't send response if already aborted or sent
      if (req.aborted || res.headersSent) {
        return;
      }
      
      logger.error({ error }, "Login failed");
      res.status(401).json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }
  });

  router.post("/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: "Refresh token is required",
          code: "VALIDATION_ERROR",
        });
      }

      const result = await authService.refresh(refreshToken);
      res.json(result);
    } catch (error) {
      logger.error({ error }, "Token refresh failed");
      res.status(401).json({
        error: "Invalid refresh token",
        code: "INVALID_TOKEN",
      });
    }
  });

  router.post("/logout", async (req: Request, res: Response) => {
    res.json({ message: "Logged out successfully" });
  });

  return router;
}

