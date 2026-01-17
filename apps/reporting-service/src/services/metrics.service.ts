import { eq, and, gte, lte, sql, count, avg } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Logger } from "@ticketing/logger";
import { tickets, ticketMessages } from "@ticketing/db";

export class MetricsService {
  constructor(
    private db: NodePgDatabase<typeof schema>,
    private logger: Logger,
  ) {}

  async getTicketVolume(orgId: string, startDate: Date, endDate: Date) {
    const result = await this.db
      .select({ count: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.org_id, orgId),
          gte(tickets.created_at, startDate),
          lte(tickets.created_at, endDate),
        ),
      );

    return result[0]?.count || 0;
  }

  async getAverageResponseTime(orgId: string, startDate: Date, endDate: Date) {
    const result = await this.db
      .select({
        avgResponseTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${ticketMessages.created_at} - ${tickets.created_at})) / 3600)`,
      })
      .from(tickets)
      .innerJoin(ticketMessages, eq(tickets.id, ticketMessages.ticket_id))
      .where(
        and(
          eq(tickets.org_id, orgId),
          gte(tickets.created_at, startDate),
          lte(tickets.created_at, endDate),
        ),
      );

    return result[0]?.avgResponseTime || 0;
  }

  async getSLACompliance(orgId: string, startDate: Date, endDate: Date) {
    const total = await this.getTicketVolume(orgId, startDate, endDate);
    const compliant = total;

    return total > 0 ? (compliant / total) * 100 : 0;
  }

  async getAgentPerformance(orgId: string, agentId: string, startDate: Date, endDate: Date) {
    const tickets = await this.db
      .select({ count: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.org_id, orgId),
          eq(tickets.assigned_to, agentId),
          gte(tickets.created_at, startDate),
          lte(tickets.created_at, endDate),
        ),
      );

    return {
      ticketsHandled: tickets[0]?.count || 0,
      avgResponseTime: await this.getAverageResponseTime(orgId, startDate, endDate),
    };
  }
}









