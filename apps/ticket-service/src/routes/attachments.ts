import { Router, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { orgContextMiddleware, type OrgRequest } from "../middleware/org-context.js";
import { AttachmentService } from "../services/attachment.service.js";

export default function attachmentRoutes(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
): Router {
  const router = Router();
  const attachmentService = new AttachmentService(db, config, logger);

  router.use(orgContextMiddleware(config.JWT_SECRET));

  router.post("/:id/attachments/presigned", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { file_name, file_size, mime_type } = req.body;
      const orgId = req.orgId;

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

      if (!file_name || !file_size || !mime_type) {
        return res.status(400).json({
          error: "file_name, file_size, and mime_type are required",
          code: "VALIDATION_ERROR",
        });
      }

      const { url, s3Key } = await attachmentService.generatePresignedUrl(
        id,
        file_name,
        file_size,
        mime_type,
        orgId,
      );

      res.json({ url, s3_key: s3Key });
    } catch (error) {
      logger.error({ error }, "Presigned URL generation failed");
      if ((error as Error).message === "Ticket not found") {
        return res.status(404).json({
          error: "Ticket not found",
          code: "NOT_FOUND",
        });
      }
      if ((error as Error).message === "S3 not configured") {
        return res.status(503).json({
          error: "File storage not configured",
          code: "SERVICE_UNAVAILABLE",
        });
      }
      res.status(500).json({
        error: "Failed to generate presigned URL",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.post("/:id/attachments", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { file_name, file_size, mime_type, s3_key, message_id } = req.body;
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

      if (!file_name || !file_size || !mime_type || !s3_key) {
        return res.status(400).json({
          error: "file_name, file_size, mime_type, and s3_key are required",
          code: "VALIDATION_ERROR",
        });
      }

      const attachment = await attachmentService.createAttachment({
        ticket_id: id,
        message_id,
        file_name,
        file_size,
        mime_type,
        s3_key,
        uploaded_by: userId,
        org_id: orgId,
      });

      res.status(201).json(attachment);
    } catch (error) {
      logger.error({ error }, "Attachment creation failed");
      if ((error as Error).message === "Ticket not found") {
        return res.status(404).json({
          error: "Ticket not found",
          code: "NOT_FOUND",
        });
      }
      res.status(500).json({
        error: "Failed to create attachment",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.get("/attachments/:id/url", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const orgId = req.orgId;

      if (!id) {
        return res.status(400).json({
          error: "Attachment ID is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!orgId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      const url = await attachmentService.getAttachmentUrl(id, orgId);

      res.json({ url });
    } catch (error) {
      logger.error({ error }, "Get attachment URL failed");
      if ((error as Error).message === "Attachment not found" || (error as Error).message === "Access denied") {
        return res.status(404).json({
          error: "Attachment not found",
          code: "NOT_FOUND",
        });
      }
      if ((error as Error).message === "S3 not configured") {
        return res.status(503).json({
          error: "File storage not configured",
          code: "SERVICE_UNAVAILABLE",
        });
      }
      res.status(500).json({
        error: "Failed to get attachment URL",
        code: "INTERNAL_ERROR",
      });
    }
  });

  return router;
}


