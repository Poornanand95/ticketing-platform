import { Router, Request, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import type { TicketStatus, TicketPriority } from "@ticketing/types";
import { orgContextMiddleware, type OrgRequest } from "../middleware/org-context.js";
import { TicketService } from "../services/ticket.service.js";
import { tickets } from "@ticketing/db";
import { eq, and } from "drizzle-orm";

export default function ticketRoutes(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
) {
  const router = Router();
  const ticketService = new TicketService(db, config, logger);

  router.use(orgContextMiddleware(config.JWT_SECRET));

  router.post("/", async (req: OrgRequest, res: Response) => {
    try {
      const { subject, priority, source, metadata, required_skill, bucket_id, parent_ticket_id, observer_ids, custom_fields } = req.body;
      const orgId = req.orgId;
      const userId = req.userId;

      if (!orgId || !userId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      if (!subject) {
        return res.status(400).json({
          error: "Subject is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (required_skill !== undefined && typeof required_skill !== "string") {
        return res.status(400).json({
          error: "required_skill must be a string",
          code: "VALIDATION_ERROR",
        });
      }

      if (observer_ids !== undefined && !Array.isArray(observer_ids)) {
        return res.status(400).json({
          error: "observer_ids must be an array",
          code: "VALIDATION_ERROR",
        });
      }

      if (parent_ticket_id !== undefined && typeof parent_ticket_id !== "string" && parent_ticket_id !== null) {
        return res.status(400).json({
          error: "parent_ticket_id must be a string or null",
          code: "VALIDATION_ERROR",
        });
      }

      if (custom_fields !== undefined && (typeof custom_fields !== "object" || Array.isArray(custom_fields))) {
        return res.status(400).json({
          error: "custom_fields must be an object",
          code: "VALIDATION_ERROR",
        });
      }

      const ticket = await ticketService.createTicket({
        org_id: orgId,
        subject,
        priority: priority || "medium",
        source: source || "web",
        created_by: userId,
        required_skill:
          typeof required_skill === "string" && required_skill.trim()
            ? required_skill.trim()
            : null,
        bucket_id:
          typeof bucket_id === "string" && bucket_id.trim()
            ? bucket_id.trim()
            : null,
        parent_ticket_id:
          typeof parent_ticket_id === "string" && parent_ticket_id.trim()
            ? parent_ticket_id.trim()
            : null,
        observer_ids: Array.isArray(observer_ids) ? observer_ids : undefined,
        metadata,
        custom_fields: custom_fields || {},
      });

      res.status(201).json(ticket);
    } catch (error) {
      logger.error({ error }, "Ticket creation failed");
      res.status(500).json({
        error: "Failed to create ticket",
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

      const { status, assigned_to, priority, bucket_id, limit, offset } = req.query;
      const userId = req.userId;

      const statusValue = typeof status === "string" ? status : undefined;
      const priorityValue = typeof priority === "string" ? priority : undefined;
      let assignedToValue: string | undefined = typeof assigned_to === "string" ? assigned_to : undefined;
      let bucketIdValue: string | null | undefined = undefined;
      
      // Handle special "me" value - replace with actual user ID
      if (assignedToValue === "me" && userId) {
        assignedToValue = userId;
      } else if (assignedToValue === "unassigned") {
        // Handle "unassigned" value - set to null
        assignedToValue = null as any;
      }

      // Handle bucket_id filter
      if (bucket_id !== undefined) {
        if (bucket_id === "null" || bucket_id === "") {
          bucketIdValue = null;
        } else if (typeof bucket_id === "string") {
          bucketIdValue = bucket_id;
        }
      }

      const tickets = await ticketService.getTickets(orgId, {
        status: statusValue as TicketStatus | undefined,
        assigned_to: assignedToValue,
        priority: priorityValue as TicketPriority | undefined,
        bucket_id: bucketIdValue,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });

      res.json(tickets);
    } catch (error) {
      logger.error({ error }, "Get tickets failed");
      res.status(500).json({
        error: "Failed to get tickets",
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

      const ticket = await ticketService.getTicketById(id, orgId);

      if (!ticket) {
        return res.status(404).json({
          error: "Ticket not found",
          code: "NOT_FOUND",
        });
      }

      res.json(ticket);
    } catch (error) {
      logger.error({ error }, "Get ticket failed");
      res.status(500).json({
        error: "Failed to get ticket",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.patch("/:id", async (req: OrgRequest, res: Response) => {
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

      if (!orgId || !userId) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "MISSING_CONTEXT",
        });
      }

      const { status, priority, assigned_to, subject, required_skill, bucket_id, parent_ticket_id, custom_fields } = req.body;

      if (required_skill !== undefined && typeof required_skill !== "string") {
        return res.status(400).json({
          error: "required_skill must be a string",
          code: "VALIDATION_ERROR",
        });
      }

      const ticket = await ticketService.updateTicket(
        id,
        orgId,
        {
          status,
          priority,
          assigned_to,
          subject,
          required_skill:
            typeof required_skill === "string" && required_skill.trim()
              ? required_skill.trim()
              : required_skill === null
                ? null
                : undefined,
          bucket_id:
            bucket_id !== undefined
              ? typeof bucket_id === "string" && bucket_id.trim()
                ? bucket_id.trim()
                : null
              : undefined,
          parent_ticket_id:
            parent_ticket_id !== undefined
              ? typeof parent_ticket_id === "string" && parent_ticket_id.trim()
                ? parent_ticket_id.trim()
                : null
              : undefined,
          custom_fields: custom_fields !== undefined ? custom_fields : undefined,
        },
        userId,
      );

      const updatedTicket = await ticketService.getTicketById(id, orgId);
      res.json(updatedTicket);
    } catch (error) {
      logger.error({ error }, "Update ticket failed");
      if ((error as Error).message === "Ticket not found") {
        return res.status(404).json({
          error: "Ticket not found",
          code: "NOT_FOUND",
        });
      }
      res.status(500).json({
        error: "Failed to update ticket",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.get("/:id/observers", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
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

      const observers = await ticketService.getObservers(id, orgId);
      res.json({ observers });
    } catch (error) {
      logger.error({ error }, "Get observers failed");
      if ((error as Error).message === "Ticket not found") {
        return res.status(404).json({
          error: "Ticket not found",
          code: "NOT_FOUND",
        });
      }
      res.status(500).json({
        error: "Failed to get observers",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.post("/:id/observers", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { user_ids } = req.body;
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

      if (!Array.isArray(user_ids)) {
        return res.status(400).json({
          error: "user_ids must be an array",
          code: "VALIDATION_ERROR",
        });
      }

      await ticketService.addObservers(id, orgId, user_ids);
      const observers = await ticketService.getObservers(id, orgId);
      res.json({ observers });
    } catch (error) {
      logger.error({ error }, "Add observers failed");
      if ((error as Error).message === "Ticket not found") {
        return res.status(404).json({
          error: "Ticket not found",
          code: "NOT_FOUND",
        });
      }
      res.status(500).json({
        error: "Failed to add observers",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.delete("/:id/observers", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { user_ids } = req.body;
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

      if (!Array.isArray(user_ids)) {
        return res.status(400).json({
          error: "user_ids must be an array",
          code: "VALIDATION_ERROR",
        });
      }

      await ticketService.removeObservers(id, orgId, user_ids);
      const observers = await ticketService.getObservers(id, orgId);
      res.json({ observers });
    } catch (error) {
      logger.error({ error }, "Remove observers failed");
      if ((error as Error).message === "Ticket not found") {
        return res.status(404).json({
          error: "Ticket not found",
          code: "NOT_FOUND",
        });
      }
      res.status(500).json({
        error: "Failed to remove observers",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.put("/:id/observers", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { user_ids } = req.body;
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

      if (!Array.isArray(user_ids)) {
        return res.status(400).json({
          error: "user_ids must be an array",
          code: "VALIDATION_ERROR",
        });
      }

      await ticketService.setObservers(id, orgId, user_ids);
      const observers = await ticketService.getObservers(id, orgId);
      res.json({ observers });
    } catch (error) {
      logger.error({ error }, "Set observers failed");
      if ((error as Error).message === "Ticket not found") {
        return res.status(404).json({
          error: "Ticket not found",
          code: "NOT_FOUND",
        });
      }
      res.status(500).json({
        error: "Failed to set observers",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.post("/:id/children", async (req: OrgRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { subject, priority, source, metadata, required_skill, bucket_id, observer_ids } = req.body;
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

      if (!subject) {
        return res.status(400).json({
          error: "Subject is required",
          code: "VALIDATION_ERROR",
        });
      }

      const [parentTicket] = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, id), eq(tickets.org_id, orgId)))
        .limit(1);

      if (!parentTicket || parentTicket.deleted_at) {
        return res.status(404).json({
          error: "Parent ticket not found",
          code: "NOT_FOUND",
        });
      }

      const childTicket = await ticketService.createTicket({
        org_id: orgId,
        subject,
        priority: priority || "medium",
        source: source || "web",
        created_by: userId,
        required_skill:
          typeof required_skill === "string" && required_skill.trim()
            ? required_skill.trim()
            : null,
        bucket_id:
          typeof bucket_id === "string" && bucket_id.trim()
            ? bucket_id.trim()
            : null,
        parent_ticket_id: id,
        observer_ids: Array.isArray(observer_ids) ? observer_ids : undefined,
        metadata,
      });

      res.status(201).json(childTicket);
    } catch (error) {
      logger.error({ error }, "Child ticket creation failed");
      if ((error as Error).message === "Parent ticket not found") {
        return res.status(404).json({
          error: "Parent ticket not found",
          code: "NOT_FOUND",
        });
      }
      res.status(500).json({
        error: "Failed to create child ticket",
        code: "INTERNAL_ERROR",
      });
    }
  });

  return router;
}

