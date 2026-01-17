import type { EventConsumer } from "@ticketing/events";
import type { TicketEvent } from "@ticketing/types";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import { TOPICS } from "@ticketing/events";
import { RuleEngineService } from "../services/rule-engine.service.js";
import { SLAService } from "../services/sla.service.js";
import axios from "axios";

export async function startTicketConsumer(
  consumer: EventConsumer,
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
) {
  const ruleEngine = new RuleEngineService(db, config, logger);
  const slaService = new SLAService(config.REDIS_URL, logger);
  const ticketServiceUrl = process.env.TICKET_SERVICE_URL || "http://localhost:3002";

  await consumer.subscribe([TOPICS.TICKET_EVENTS]);

  await consumer.run(async (event: TicketEvent) => {
    try {
      if (event.event_type === "ticket.created" || event.event_type === "ticket.updated") {
        // Fetch full ticket data for rule evaluation
        let ticket;
        try {
          const response = await axios.get(`${ticketServiceUrl}/tickets/${event.data.ticket_id}`, {
            headers: {
              "X-Org-Id": event.org_id,
              "X-User-Id": "system",
            },
          });
          ticket = response.data;
        } catch (error: any) {
          logger.error(
            { error: error.response?.data || error.message, ticket_id: event.data.ticket_id },
            "Failed to fetch ticket data"
          );
          // Fallback to minimal ticket data
          ticket = {
            id: event.data.ticket_id,
            org_id: event.org_id,
            ...event.data,
          } as any;
        }

        await ruleEngine.evaluateRules(ticket, event.org_id);
        
        if (event.event_type === "ticket.created") {
          await slaService.startSLATimer(event.data.ticket_id, 24);
        }
      }

      if (event.event_type === "ticket.replied") {
        await slaService.clearSLATimer(event.data.ticket_id);
      }
    } catch (error) {
      logger.error({ error, event }, "Failed to process automation event");
    }
  });
}





