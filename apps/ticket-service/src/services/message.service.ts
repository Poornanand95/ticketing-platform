import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Logger } from "@ticketing/logger";
import { ticketMessages, tickets } from "@ticketing/db";
import { nanoid } from "nanoid";
import { emitTicketEvent } from "../events/ticket.events.js";

export class MessageService {
  constructor(
    private db: NodePgDatabase<typeof schema>,
    private logger: Logger,
  ) {}

  async createMessage(data: {
    ticket_id: string;
    user_id: string;
    content: string;
    is_private: boolean;
    org_id: string;
  }) {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.id, data.ticket_id))
      .limit(1);

    if (!ticket || ticket.org_id !== data.org_id) {
      throw new Error("Ticket not found");
    }

    const [message] = await this.db
      .insert(ticketMessages)
      .values({
        id: nanoid(),
        ticket_id: data.ticket_id,
        user_id: data.user_id,
        content: data.content,
        is_private: data.is_private,
      })
      .returning();

    await emitTicketEvent({
      event_type: "ticket.replied",
      org_id: data.org_id,
      user_id: data.user_id,
      timestamp: new Date().toISOString(),
      data: {
        ticket_id: data.ticket_id,
        message_id: message.id,
        is_private: data.is_private,
      },
    });

    return message;
  }

  async getMessages(ticketId: string, orgId: string, userId?: string) {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket || ticket.org_id !== orgId) {
      return [];
    }

    const messages = await this.db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticket_id, ticketId));

    return messages
      .filter((m) => {
        if (m.deleted_at) return false;
        if (m.is_private && m.user_id !== userId) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }
}

