import { Router, Request, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { automationRules } from "@ticketing/db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { DefaultAutomationsService } from "../services/default-automations.service.js";

export default function ruleRoutes(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
) {
  const router = Router();

  const defaultAutomationsService = new DefaultAutomationsService(db, logger);

  router.post("/", async (req: Request, res: Response) => {
    try {
      const { org_id, name, priority, conditions, actions, enabled, is_default } = req.body;

      if (!org_id || !name || !conditions || !actions) {
        return res.status(400).json({
          error: "org_id, name, conditions, and actions are required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!Array.isArray(conditions) || !Array.isArray(actions)) {
        return res.status(400).json({
          error: "conditions and actions must be arrays",
          code: "VALIDATION_ERROR",
        });
      }

      const ruleResult = await db
        .insert(automationRules)
        .values({
          id: nanoid(),
          org_id,
          name,
          priority: priority || 0,
          conditions,
          actions,
          enabled: enabled !== false,
          is_default: is_default === true,
        })
        .returning();

      const rule = Array.isArray(ruleResult) ? ruleResult[0] : null;
      if (!rule) {
        throw new Error("Failed to create rule");
      }

      res.status(201).json(rule);
    } catch (error) {
      logger.error({ error }, "Rule creation failed");
      res.status(500).json({
        error: "Failed to create rule",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.get("/", async (req: Request, res: Response) => {
    try {
      const { org_id } = req.query;

      if (!org_id) {
        return res.status(400).json({
          error: "org_id is required",
          code: "VALIDATION_ERROR",
        });
      }

      const rules = await db
        .select()
        .from(automationRules)
        .where(eq(automationRules.org_id, org_id as string));

      res.json(rules);
    } catch (error) {
      logger.error({ error }, "Get rules failed");
      res.status(500).json({
        error: "Failed to get rules",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const ruleResult = await db
        .update(automationRules)
        .set({ ...updates, updated_at: new Date() })
        .where(eq(automationRules.id, id))
        .returning();

      const rule = Array.isArray(ruleResult) ? ruleResult[0] : null;
      if (!rule) {
        return res.status(404).json({
          error: "Rule not found",
          code: "NOT_FOUND",
        });
      }

      res.json(rule);
    } catch (error) {
      logger.error({ error }, "Rule update failed");
      res.status(500).json({
        error: "Failed to update rule",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const ruleResult = await db
        .select()
        .from(automationRules)
        .where(eq(automationRules.id, id))
        .limit(1);

      const rule = Array.isArray(ruleResult) ? ruleResult[0] : null;
      if (!rule) {
        return res.status(404).json({
          error: "Rule not found",
          code: "NOT_FOUND",
        });
      }

      if (rule.is_default) {
        return res.status(400).json({
          error: "Default automations cannot be deleted",
          code: "VALIDATION_ERROR",
        });
      }

      await db.delete(automationRules).where(eq(automationRules.id, id));

      res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Rule deletion failed");
      res.status(500).json({
        error: "Failed to delete rule",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.get("/defaults", async (req: Request, res: Response) => {
    try {
      const { org_id } = req.query;

      if (!org_id) {
        return res.status(400).json({
          error: "org_id is required",
          code: "VALIDATION_ERROR",
        });
      }

      const defaults = await defaultAutomationsService.getDefaults(org_id as string);
      res.json(defaults);
    } catch (error) {
      logger.error({ error }, "Get defaults failed");
      res.status(500).json({
        error: "Failed to get default automations",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.post("/initialize-defaults", async (req: Request, res: Response) => {
    try {
      const { org_id } = req.body;

      if (!org_id) {
        return res.status(400).json({
          error: "org_id is required",
          code: "VALIDATION_ERROR",
        });
      }

      const created = await defaultAutomationsService.initializeDefaults(org_id);
      res.status(201).json({ created: created.length, rules: created });
    } catch (error) {
      logger.error({ error }, "Initialize defaults failed");
      res.status(500).json({
        error: "Failed to initialize default automations",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.patch("/:id/toggle", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({
          error: "enabled must be a boolean",
          code: "VALIDATION_ERROR",
        });
      }

      const ruleResult = await db
        .select()
        .from(automationRules)
        .where(eq(automationRules.id, id))
        .limit(1);

      const rule = Array.isArray(ruleResult) ? ruleResult[0] : null;
      if (!rule) {
        return res.status(404).json({
          error: "Rule not found",
          code: "NOT_FOUND",
        });
      }

      const updatedResult = await db
        .update(automationRules)
        .set({ enabled, updated_at: new Date() })
        .where(eq(automationRules.id, id))
        .returning();

      const updated = Array.isArray(updatedResult) ? updatedResult[0] : null;
      if (!updated) {
        return res.status(404).json({
          error: "Rule not found",
          code: "NOT_FOUND",
        });
      }

      res.json(updated);
    } catch (error) {
      logger.error({ error }, "Toggle rule failed");
      res.status(500).json({
        error: "Failed to toggle rule",
        code: "INTERNAL_ERROR",
      });
    }
  });

  return router;
}





