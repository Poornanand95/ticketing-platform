import { Router, Request, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { TicketService } from "../services/ticket.service.js";
import { simpleParser } from "mailparser";

export function createEmailIngestRoute(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
) {
  const router = Router();
  const ticketService = new TicketService(db, config, logger);

  router.post("/ingest/email", async (req: Request, res: Response) => {
    try {
      const rawEmail = req.body.raw || req.body;

      const parsed = await simpleParser(rawEmail);

      const subject = parsed.subject || "";
      const from = parsed.from?.value[0]?.address || "";
      const text = parsed.text || "";
      const html = parsed.html || "";

      const ticketNumberMatch = subject.match(/TCK-\d{4}-\d{4}/);
      const orgId = req.headers["x-org-id"] as string || "default";

      if (ticketNumberMatch) {
        logger.info({ ticket_number: ticketNumberMatch[0] }, "Linking to existing ticket");
      }

      const ticket = await ticketService.createTicket({
        org_id: orgId,
        subject: subject || "Email Ticket",
        priority: "medium",
        source: "email",
        created_by: from,
        metadata: {
          from,
          email_subject: subject,
          email_text: text,
          email_html: html,
        },
      });

      res.status(201).json(ticket);
    } catch (error) {
      logger.error({ error }, "Email ingestion failed");
      res.status(500).json({
        error: "Failed to ingest email",
        code: "INTERNAL_ERROR",
      });
    }
  });

  return router;
}

