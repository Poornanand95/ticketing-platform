import { Router, Request, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { UserService } from "../services/user.service.js";

export default function userRoutes(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
) {
  const router = Router();
  const userService = new UserService(db, logger);

  router.use(authMiddleware(config.JWT_SECRET, logger));

  router.post(
    "/",
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { email, name, password, roleNames } = req.body;
        const orgId = req.user?.org_id;

        if (!email || !name || !password || !orgId) {
          return res.status(400).json({
            error: "Email, name, password, and org_id are required",
            code: "VALIDATION_ERROR",
          });
        }

        const user = await userService.createUser({
          org_id: orgId,
          email,
          name,
          password,
          roleNames: roleNames || ["customer"],
        });

        res.status(201).json(user);
      } catch (error) {
        logger.error({ error }, "User creation failed");
        res.status(500).json({
          error: "Failed to create user",
          code: "INTERNAL_ERROR",
        });
      }
    },
  );

  router.get(
    "/",
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const orgId = req.user?.org_id;

        if (!orgId) {
          return res.status(401).json({
            error: "Unauthorized",
            code: "MISSING_ORG",
          });
        }

        const skill =
          typeof req.query.skill === "string" ? req.query.skill : undefined;

        const agents = await userService.getAgents(orgId, { skill });
        res.json(agents);
      } catch (error) {
        logger.error({ error }, "Get agents failed");
        res.status(500).json({
          error: "Failed to get agents",
          code: "INTERNAL_ERROR",
        });
      }
    },
  );

  router.get("/:id", async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const orgId = req.user?.org_id;

      if (!orgId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_ORG",
        });
      }

      const user = await userService.getUserById(id, orgId);

      if (!user) {
        return res.status(404).json({
          error: "User not found",
          code: "NOT_FOUND",
        });
      }

      res.json(user);
    } catch (error) {
      logger.error({ error }, "Get user failed");
      res.status(500).json({
        error: "Failed to get user",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.put(
    "/:id",
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const orgId = req.user?.org_id;
        const { skills, is_active } = req.body;

        if (!orgId) {
          return res.status(401).json({
            error: "Unauthorized",
            code: "MISSING_ORG",
          });
        }

        if (skills !== undefined && !Array.isArray(skills)) {
          return res.status(400).json({
            error: "Skills must be an array",
            code: "VALIDATION_ERROR",
          });
        }

        if (is_active !== undefined && typeof is_active !== "boolean") {
          return res.status(400).json({
            error: "is_active must be a boolean",
            code: "VALIDATION_ERROR",
          });
        }

        const updatedAgent = await userService.updateAgent(id, orgId, {
          skills,
          is_active,
        });

        if (!updatedAgent) {
          return res.status(404).json({
            error: "Agent not found",
            code: "NOT_FOUND",
          });
        }

        res.json(updatedAgent);
      } catch (error) {
        logger.error({ error }, "Update agent failed");
        res.status(500).json({
          error: "Failed to update agent",
          code: "INTERNAL_ERROR",
        });
      }
    },
  );

  return router;
}

