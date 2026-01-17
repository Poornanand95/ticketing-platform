import type { EventConsumer } from "@ticketing/events";
import type { TicketEvent } from "@ticketing/types";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { TOPICS } from "@ticketing/events";
import { EmailService } from "../services/email.service.js";

export async function startTicketConsumer(
  consumer: EventConsumer,
  config: Env,
  logger: Logger,
) {
  const emailService = new EmailService(config, logger);

  await consumer.subscribe([TOPICS.TICKET_EVENTS]);

  await consumer.run(async (event: TicketEvent) => {
    try {
      logger.info({ event }, "Processing ticket event");

      switch (event.event_type) {
        case "ticket.created":
          await emailService.sendTicketCreated(event);
          break;
        case "ticket.replied":
          await emailService.sendAgentReply(event);
          break;
        case "ticket.updated":
          await emailService.sendStatusChange(event);
          break;
        case "ticket.closed":
          await emailService.sendStatusChange(event);
          break;
        default:
          logger.debug({ event_type: event.event_type }, "Unhandled event type");
      }
    } catch (error) {
      logger.error({ error, event }, "Failed to process event");
    }
  });
}

