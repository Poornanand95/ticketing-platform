import { eq, and, desc, sql, isNull, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Logger } from "@ticketing/logger";
import type { Ticket, TicketStatus, TicketPriority, TicketSource } from "@ticketing/types";
import { tickets, ticketMessages, users, ticketObservers } from "@ticketing/db";
import { nanoid } from "nanoid";
import { TicketNumberService } from "./ticket-number.service.js";
import { emitTicketEvent } from "../events/ticket.events.js";

export class TicketService {
  private ticketNumberService: TicketNumberService;

  constructor(
    private db: NodePgDatabase<typeof schema>,
    private config: { REDIS_URL: string },
    private logger: Logger,
  ) {
    this.ticketNumberService = new TicketNumberService(
      config.REDIS_URL,
      logger,
    );
  }

  async createTicket(data: {
    org_id: string;
    subject: string;
    priority: TicketPriority;
    source: TicketSource;
    created_by: string;
    required_skill?: string | null;
    bucket_id?: string | null;
    parent_ticket_id?: string | null;
    observer_ids?: string[];
    metadata?: Record<string, unknown>;
    custom_fields?: Record<string, unknown>;
  }) {
    const ticketNumber = await this.ticketNumberService.generateTicketNumber(
      data.org_id,
    );

    if (data.parent_ticket_id) {
      const parentTicketResult = await this.db
        .select()
        .from(tickets)
        .where(
          and(
            eq(tickets.id, data.parent_ticket_id),
            eq(tickets.org_id, data.org_id),
          ),
        )
        .limit(1);

      const parentTicket = parentTicketResult[0];
      if (!parentTicket || parentTicket.deleted_at) {
        throw new Error("Parent ticket not found");
      }
    }

    const ticketResult = await this.db
      .insert(tickets)
      .values({
        id: nanoid(),
        org_id: data.org_id,
        ticket_number: ticketNumber,
        subject: data.subject,
        priority: data.priority,
        source: data.source,
        created_by: data.created_by,
        required_skill: data.required_skill ?? null,
        bucket_id: data.bucket_id ?? null,
        parent_ticket_id: data.parent_ticket_id ?? null,
        metadata: data.metadata || {},
        custom_fields: data.custom_fields || {},
        status: "open",
      })
      .returning();

    const ticket = Array.isArray(ticketResult) ? ticketResult[0] : null;
    if (!ticket) {
      throw new Error("Failed to create ticket");
    }

    if (data.observer_ids && data.observer_ids.length > 0) {
      await this.addObservers(ticket.id, data.org_id, data.observer_ids);
    }

    await emitTicketEvent({
      event_type: "ticket.created",
      org_id: data.org_id,
      user_id: data.created_by,
      timestamp: new Date().toISOString(),
      data: {
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        priority: ticket.priority,
        required_skill: ticket.required_skill,
      },
    });

    return await this.getTicketById(ticket.id, data.org_id);
  }

  async getTickets(orgId: string, filters?: {
    status?: TicketStatus;
    assigned_to?: string | null;
    priority?: TicketPriority;
    bucket_id?: string | null;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [eq(tickets.org_id, orgId)];

    if (filters?.status) {
      conditions.push(eq(tickets.status, filters.status));
    }
    if (filters?.assigned_to !== undefined) {
      if (filters.assigned_to === null) {
        // Handle "unassigned" - tickets with no assignment
        conditions.push(sql`${tickets.assigned_to} IS NULL`);
      } else {
        // Handle specific user assignment
        conditions.push(eq(tickets.assigned_to, filters.assigned_to));
      }
    }
    if (filters?.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }
    if (filters?.bucket_id !== undefined) {
      if (filters.bucket_id === null) {
        conditions.push(sql`${tickets.bucket_id} IS NULL`);
      } else {
        conditions.push(eq(tickets.bucket_id, filters.bucket_id));
      }
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const results = await this.db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(desc(tickets.created_at))
      .limit(limit)
      .offset(offset);

    return results.filter((t) => !t.deleted_at);
  }

  async getTicketById(ticketId: string, orgId: string) {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.org_id, orgId)))
      .limit(1);

    if (!ticket || ticket.deleted_at) {
      return null;
    }

    const messages = await this.db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticket_id, ticketId))
      .orderBy(ticketMessages.created_at);

    const observerRecords = await this.db
      .select()
      .from(ticketObservers)
      .where(eq(ticketObservers.ticket_id, ticketId));

    let parent: typeof ticket | null = null;
    if (ticket.parent_ticket_id) {
      const [parentTicket] = await this.db
        .select()
        .from(tickets)
        .where(
          and(
            eq(tickets.id, ticket.parent_ticket_id),
            eq(tickets.org_id, orgId),
          ),
        )
        .limit(1);
      if (parentTicket && !parentTicket.deleted_at) {
        parent = parentTicket;
      }
    }

    const childTickets = await this.db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.parent_ticket_id, ticketId),
          eq(tickets.org_id, orgId),
        ),
      )
      .orderBy(tickets.created_at);

    return {
      ...ticket,
      observers: observerRecords.map((o) => o.user_id),
      messages: messages.filter((m) => !m.deleted_at),
      parent: parent || undefined,
      children: childTickets.filter((t) => !t.deleted_at),
    };
  }

  async updateTicket(
    ticketId: string,
    orgId: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assigned_to?: string | null;
      subject?: string;
      required_skill?: string | null;
      bucket_id?: string | null;
      parent_ticket_id?: string | null;
      custom_fields?: Record<string, unknown>;
    },
    userId: string,
  ) {
    const [existing] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.org_id, orgId)))
      .limit(1);

    if (!existing || existing.deleted_at) {
      throw new Error("Ticket not found");
    }

    if (updates.parent_ticket_id !== undefined) {
      if (updates.parent_ticket_id === ticketId) {
        throw new Error("Ticket cannot be its own parent");
      }

      if (updates.parent_ticket_id) {
        const [parentTicket] = await this.db
          .select()
          .from(tickets)
          .where(
            and(
              eq(tickets.id, updates.parent_ticket_id),
              eq(tickets.org_id, orgId),
            ),
          )
          .limit(1);

        if (!parentTicket || parentTicket.deleted_at) {
          throw new Error("Parent ticket not found");
        }

        if (parentTicket.parent_ticket_id === ticketId) {
          throw new Error("Cannot create circular parent-child relationship");
        }
      }
    }

    const [updated] = await this.db
      .update(tickets)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    if (updates.status && updates.status !== existing.status) {
      await emitTicketEvent({
        event_type: "ticket.updated",
        org_id: orgId,
        user_id: userId,
        timestamp: new Date().toISOString(),
        data: {
          ticket_id: ticketId,
          status: updates.status,
          previous_status: existing.status,
        },
      });

      if (updates.status === "closed") {
        await emitTicketEvent({
          event_type: "ticket.closed",
          org_id: orgId,
          user_id: userId,
          timestamp: new Date().toISOString(),
          data: {
            ticket_id: ticketId,
          },
        });
      }
    }

    if (updates.assigned_to !== undefined && updates.assigned_to !== existing.assigned_to) {
      await emitTicketEvent({
        event_type: "ticket.assigned",
        org_id: orgId,
        user_id: userId,
        timestamp: new Date().toISOString(),
        data: {
          ticket_id: ticketId,
          assigned_to: updates.assigned_to,
          previous_assigned_to: existing.assigned_to,
        },
      });
    }

    // Emit ticket.updated for priority changes (for automation triggers)
    // Skip if updated by system to prevent infinite loops
    if (updates.priority && updates.priority !== existing.priority && userId !== "system") {
      await emitTicketEvent({
        event_type: "ticket.updated",
        org_id: orgId,
        user_id: userId,
        timestamp: new Date().toISOString(),
        data: {
          ticket_id: ticketId,
          priority: updates.priority,
          previous_priority: existing.priority,
        },
      });
    }

    // Emit ticket.updated for required_skill changes (for automation triggers)
    if (updates.required_skill !== undefined && updates.required_skill !== existing.required_skill && userId !== "system") {
      await emitTicketEvent({
        event_type: "ticket.updated",
        org_id: orgId,
        user_id: userId,
        timestamp: new Date().toISOString(),
        data: {
          ticket_id: ticketId,
          required_skill: updates.required_skill,
          previous_required_skill: existing.required_skill,
        },
      });
    }

    return updated;
  }

  async getObservers(ticketId: string, orgId: string): Promise<string[]> {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.org_id, orgId)))
      .limit(1);

    if (!ticket || ticket.deleted_at) {
      throw new Error("Ticket not found");
    }

    const observerRecords = await this.db
      .select()
      .from(ticketObservers)
      .where(eq(ticketObservers.ticket_id, ticketId));

    return observerRecords.map((o) => o.user_id);
  }

  async addObservers(ticketId: string, orgId: string, userIds: string[]): Promise<void> {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.org_id, orgId)))
      .limit(1);

    if (!ticket || ticket.deleted_at) {
      throw new Error("Ticket not found");
    }

    const existingObservers = await this.db
      .select()
      .from(ticketObservers)
      .where(
        and(
          eq(ticketObservers.ticket_id, ticketId),
          inArray(ticketObservers.user_id, userIds),
        ),
      );

    const existingUserIds = new Set(existingObservers.map((o) => o.user_id));
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length > 0) {
      await this.db.insert(ticketObservers).values(
        newUserIds.map((user_id) => ({
          ticket_id: ticketId,
          user_id,
        })),
      );
    }
  }

  async removeObservers(ticketId: string, orgId: string, userIds: string[]): Promise<void> {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.org_id, orgId)))
      .limit(1);

    if (!ticket || ticket.deleted_at) {
      throw new Error("Ticket not found");
    }

    if (userIds.length > 0) {
      await this.db
        .delete(ticketObservers)
        .where(
          and(
            eq(ticketObservers.ticket_id, ticketId),
            inArray(ticketObservers.user_id, userIds),
          ),
        );
    }
  }

  async setObservers(ticketId: string, orgId: string, userIds: string[]): Promise<void> {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.org_id, orgId)))
      .limit(1);

    if (!ticket || ticket.deleted_at) {
      throw new Error("Ticket not found");
    }

    await this.db
      .delete(ticketObservers)
      .where(eq(ticketObservers.ticket_id, ticketId));

    if (userIds.length > 0) {
      await this.db.insert(ticketObservers).values(
        userIds.map((user_id) => ({
          ticket_id: ticketId,
          user_id,
        })),
      );
    }
  }
}

