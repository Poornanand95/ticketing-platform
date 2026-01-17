import { Router, Request, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { orgContextMiddleware, type OrgRequest } from "../middleware/org-context.js";
import { BucketService } from "../services/bucket.service.js";
import { hasRole } from "@ticketing/auth";

export default function bucketRoutes(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
): Router {
  const router = Router();
  const bucketService = new BucketService(db, logger);

  router.use(orgContextMiddleware(config.JWT_SECRET));

  router.post("/", async (req: OrgRequest, res: Response) => {
    try {
      const { name, tag, description, color, custom_fields } = req.body;
      const orgId = req.orgId;
      const userId = req.userId;
      const userRoles = req.user?.roles || [];

      if (!orgId || !userId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      if (!hasRole(userRoles, "admin")) {
        return res.status(403).json({
          error: "Forbidden - Admin access required",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          error: "Name is required and must be a non-empty string",
          code: "VALIDATION_ERROR",
        });
      }

      if (custom_fields !== undefined && !Array.isArray(custom_fields)) {
        return res.status(400).json({
          error: "custom_fields must be an array",
          code: "VALIDATION_ERROR",
        });
      }

      const bucket = await bucketService.createBucket({
        org_id: orgId,
        name: name.trim(),
        tag: tag || null,
        description: description || null,
        color: color || null,
        custom_fields: custom_fields || [],
      });

      res.status(201).json(bucket);
    } catch (error) {
      logger.error({ error }, "Bucket creation failed");
      res.status(500).json({
        error: "Failed to create bucket",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.get("/", async (req: OrgRequest, res: Response) => {
    try {
      const orgId = req.orgId;

      if (!orgId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      const includeCount = req.query.include_count === "true";
      const bucketList = await bucketService.getBuckets(orgId, includeCount);
      res.json(bucketList);
    } catch (error) {
      logger.error({ error }, "Get buckets failed");
      res.status(500).json({
        error: "Failed to get buckets",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.get("/:id", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const orgId = req.orgId;

      if (!id) {
        return res.status(400).json({
          error: "Bucket ID is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!orgId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      const bucket = await bucketService.getBucketById(id, orgId);

      if (!bucket) {
        return res.status(404).json({
          error: "Bucket not found",
          code: "NOT_FOUND",
        });
      }

      res.json(bucket);
    } catch (error) {
      logger.error({ error }, "Get bucket failed");
      res.status(500).json({
        error: "Failed to get bucket",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.patch("/:id", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, tag, description, color, custom_fields } = req.body;
      const orgId = req.orgId;
      const userId = req.userId;
      const userRoles = req.user?.roles || [];

      if (!id) {
        return res.status(400).json({
          error: "Bucket ID is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!orgId || !userId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      if (!hasRole(userRoles, "admin")) {
        return res.status(403).json({
          error: "Forbidden - Admin access required",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      if (name !== undefined && (typeof name !== "string" || !name.trim())) {
        return res.status(400).json({
          error: "Name must be a non-empty string",
          code: "VALIDATION_ERROR",
        });
      }

      if (custom_fields !== undefined && !Array.isArray(custom_fields)) {
        return res.status(400).json({
          error: "custom_fields must be an array",
          code: "VALIDATION_ERROR",
        });
      }

      const bucket = await bucketService.updateBucket(id, orgId, {
        name: name?.trim(),
        tag: tag !== undefined ? (tag || null) : undefined,
        description: description !== undefined ? (description || null) : undefined,
        color: color !== undefined ? (color || null) : undefined,
        custom_fields: custom_fields !== undefined ? custom_fields : undefined,
      });

      res.json(bucket);
    } catch (error) {
      logger.error({ error }, "Update bucket failed");
      const errorMessage = (error as Error).message;
      
      if (errorMessage === "Bucket not found") {
        return res.status(404).json({
          error: "Bucket not found",
          code: "NOT_FOUND",
        });
      }
      
      if (errorMessage.includes("Cannot change bucket name")) {
        return res.status(400).json({
          error: errorMessage,
          code: "BUCKET_HAS_TICKETS",
        });
      }
      
      res.status(500).json({
        error: "Failed to update bucket",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.delete("/:id", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const orgId = req.orgId;
      const userId = req.userId;
      const userRoles = req.user?.roles || [];

      if (!id) {
        return res.status(400).json({
          error: "Bucket ID is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!orgId || !userId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      if (!hasRole(userRoles, "admin")) {
        return res.status(403).json({
          error: "Forbidden - Admin access required",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      await bucketService.deleteBucket(id, orgId);

      res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Delete bucket failed");
      const errorMessage = (error as Error).message;
      
      if (errorMessage === "Bucket not found") {
        return res.status(404).json({
          error: "Bucket not found",
          code: "NOT_FOUND",
        });
      }
      
      if (errorMessage.includes("Cannot delete bucket")) {
        return res.status(400).json({
          error: errorMessage,
          code: "BUCKET_HAS_TICKETS",
        });
      }
      
      res.status(500).json({
        error: "Failed to delete bucket",
        code: "INTERNAL_ERROR",
      });
    }
  });

  return router;
}

