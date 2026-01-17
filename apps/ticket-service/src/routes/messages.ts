import { Router, Request, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { orgContextMiddleware, type OrgRequest } from "../middleware/org-context.js";
import { MessageService } from "../services/message.service.js";

export default function messageRoutes(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
) {
  const router = Router();
  const messageService = new MessageService(db, logger);

  router.use(orgContextMiddleware(config.JWT_SECRET));

  router.post("/:id/messages", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content, is_private } = req.body;
      const orgId = req.orgId;
      const userId = req.userId;

      if (!id) {
        return res.status(400).json({
          error: "Ticket ID is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!orgId || !userId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      if (!content) {
        return res.status(400).json({
          error: "Content is required",
          code: "VALIDATION_ERROR",
        });
      }

      const message = await messageService.createMessage({
        ticket_id: id,
        user_id: userId,
        content,
        is_private: is_private || false,
        org_id: orgId,
      });

      res.status(201).json(message);
    } catch (error) {
      logger.error({ error }, "Message creation failed");
      if ((error as Error).message === "Ticket not found") {
        return res.status(404).json({
          error: "Ticket not found",
          code: "NOT_FOUND",
        });
      }
      res.status(500).json({
        error: "Failed to create message",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.get("/:id/messages", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const orgId = req.orgId;
      const userId = req.userId;

      if (!id) {
        return res.status(400).json({
          error: "Ticket ID is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!orgId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      const messages = await messageService.getMessages(id, orgId, userId);

      res.json(messages);
    } catch (error) {
      logger.error({ error }, "Get messages failed");
      res.status(500).json({
        error: "Failed to get messages",
        code: "INTERNAL_ERROR",
      });
    }
  });

  return router;
}


