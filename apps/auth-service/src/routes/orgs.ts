import { Router, Request, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { OrgService } from "../services/org.service.js";

export default function orgRoutes(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
) {
  const router = Router();
  const orgService = new OrgService(db, logger);

  router.use(authMiddleware(config.JWT_SECRET, logger));

  router.get("/:id", async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const orgId = req.user?.org_id;

      if (id !== orgId && !req.user?.roles.includes("admin")) {
        return res.status(403).json({
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      const org = await orgService.getOrgById(id);

      if (!org) {
        return res.status(404).json({
          error: "Organization not found",
          code: "NOT_FOUND",
        });
      }

      res.json(org);
    } catch (error) {
      logger.error({ error }, "Get org failed");
      res.status(500).json({
        error: "Failed to get organization",
        code: "INTERNAL_ERROR",
      });
    }
  });

  return router;
}

