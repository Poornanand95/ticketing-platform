import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Logger } from "@ticketing/logger";
import type { Env } from "@ticketing/config";
import type { RuleCondition, RuleAction, Ticket } from "@ticketing/types";
import { automationRules, users, userRoles, roles, tickets } from "@ticketing/db";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import axios, { AxiosInstance } from "axios";

export class RuleEngineService {
  private ticketServiceClient: AxiosInstance;
  private authServiceClient: AxiosInstance;

  constructor(
    private db: NodePgDatabase<typeof schema>,
    private config: Env,
    private logger: Logger,
  ) {
    const ticketServiceUrl = process.env.TICKET_SERVICE_URL || "http://localhost:3002";
    const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3001";

    this.ticketServiceClient = axios.create({
      baseURL: ticketServiceUrl,
      timeout: 10000,
    });

    this.authServiceClient = axios.create({
      baseURL: authServiceUrl,
      timeout: 10000,
    });
  }

  async evaluateRules(ticket: Ticket, orgId: string) {
    const rules = await this.db
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.org_id, orgId),
          eq(automationRules.enabled, true),
        ),
      )
      .orderBy(automationRules.priority);

    for (const rule of rules) {
      if (this.evaluateConditions(rule.conditions as RuleCondition[], ticket)) {
        await this.executeActions(rule.actions as RuleAction[], ticket);
        this.logger.info({ rule_id: rule.id, ticket_id: ticket.id }, "Rule executed");
      }
    }
  }

  private evaluateConditions(
    conditions: RuleCondition[],
    ticket: Ticket,
  ): boolean {
    return conditions.every((condition) => {
      const value = (ticket as any)[condition.field];
      
      // Handle time-based fields
      if (condition.field === "days_since_created" || condition.field === "days_since_last_activity") {
        const ticketDate = condition.field === "days_since_created" 
          ? new Date(ticket.created_at)
          : ticket.updated_at ? new Date(ticket.updated_at) : new Date(ticket.created_at);
        const daysDiff = Math.floor((Date.now() - ticketDate.getTime()) / (1000 * 60 * 60 * 24));
        const compareValue = Number(condition.value);
        
        switch (condition.operator) {
          case "greater_than":
            return daysDiff > compareValue;
          case "less_than":
            return daysDiff < compareValue;
          case "equals":
            return daysDiff === compareValue;
          default:
            return false;
        }
      }

      switch (condition.operator) {
        case "equals":
          return value === condition.value;
        case "not_equals":
          return value !== condition.value;
        case "contains":
          return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
        case "starts_with":
          return String(value).toLowerCase().startsWith(String(condition.value).toLowerCase());
        case "ends_with":
          return String(value).toLowerCase().endsWith(String(condition.value).toLowerCase());
        case "greater_than":
          return Number(value) > Number(condition.value);
        case "less_than":
          return Number(value) < Number(condition.value);
        case "in":
          return Array.isArray(condition.value) && condition.value.includes(value);
        case "contains_any":
          // Check if any value in the array is contained in the field value
          if (Array.isArray(condition.value)) {
            const fieldValue = String(value).toLowerCase();
            return condition.value.some((v) => fieldValue.includes(String(v).toLowerCase()));
          }
          return false;
        case "is_null":
          return value === null || value === undefined;
        case "is_not_null":
          return value !== null && value !== undefined;
        default:
          return false;
      }
    });
  }

  private async executeActions(actions: RuleAction[], ticket: Ticket) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case "assign_agent":
            await this.assignAgent(ticket, action.params);
            break;
          case "set_priority":
            await this.setPriority(ticket, action.params.priority as string);
            break;
          case "assign_to_bucket":
            await this.assignToBucket(ticket, action.params);
            break;
          case "add_observer":
            await this.addObserver(ticket, action.params.user_ids as string[]);
            break;
          case "escalate":
            await this.escalate(ticket, action.params);
            break;
          case "close_ticket":
            await this.closeTicket(ticket, action.params);
            break;
          case "send_notification":
            await this.sendNotification(ticket, action.params);
            break;
          case "set_required_skill":
            await this.setRequiredSkill(ticket, action.params.skill as string);
            break;
          default:
            this.logger.warn({ action_type: action.type }, "Unknown action type");
        }
      } catch (error) {
        this.logger.error(
          { error, ticket_id: ticket.id, action_type: action.type },
          "Failed to execute action"
        );
      }
    }
  }

  private async assignAgent(ticket: Ticket, params: Record<string, unknown>) {
    let agentId: string | null = null;

    if (params.agent_id) {
      agentId = params.agent_id as string;
    } else if (params.strategy === "skill_match" && ticket.required_skill) {
      agentId = await this.findAgentBySkill(ticket.org_id, ticket.required_skill);
    }

    if (!agentId) {
      this.logger.warn({ ticket_id: ticket.id }, "No agent found to assign");
      return;
    }

    try {
      await this.ticketServiceClient.patch(`/tickets/${ticket.id}`, {
        assigned_to: agentId,
      }, {
        headers: {
          "X-Org-Id": ticket.org_id,
          "X-User-Id": "system", // System user for automation
        },
      });
      this.logger.info({ ticket_id: ticket.id, agent_id: agentId }, "Agent assigned");
    } catch (error: any) {
      this.logger.error(
        { error: error.response?.data || error.message, ticket_id: ticket.id },
        "Failed to assign agent"
      );
      throw error;
    }
  }

  private async findAgentBySkill(orgId: string, skill: string): Promise<string | null> {
    try {
      const agentRole = await this.db
        .select()
        .from(roles)
        .where(eq(roles.name, "agent"))
        .limit(1);

      if (agentRole.length === 0 || !agentRole[0]) {
        return null;
      }

      const conditions = [
        eq(users.org_id, orgId),
        eq(userRoles.role_id, agentRole[0].id),
        isNull(users.deleted_at),
        eq(users.is_active, true),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${users.skills}) AS skill_item
          WHERE LOWER(skill_item) = LOWER(${skill})
        )`,
      ];

      // Query agents with their assigned ticket counts
      const availableAgents = await this.db
        .select({
          id: users.id,
          assigned_count: sql<number>`(
            SELECT COUNT(*)::int
            FROM ${tickets}
            WHERE ${tickets.assigned_to} = ${users.id}
            AND ${tickets.status} IN ('open', 'pending')
            AND ${tickets.deleted_at} IS NULL
          )`,
        })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.user_id))
        .where(and(...conditions));

      if (availableAgents.length === 0) {
        this.logger.warn({ org_id: orgId, skill }, "No agents found with matching skill");
        return null;
      }

      // Sort by assigned_count (ascending) to get least assigned agent first
      const sortedAgents = availableAgents.sort((a, b) => 
        (a.assigned_count || 0) - (b.assigned_count || 0)
      );

      // Return the agent with the least assigned tickets (round-robin)
      const selectedAgent = sortedAgents[0];
      this.logger.info(
        { 
          org_id: orgId, 
          skill, 
          agent_id: selectedAgent.id, 
          assigned_count: selectedAgent.assigned_count,
          total_available: availableAgents.length 
        },
        "Agent selected for skill-based assignment"
      );

      return selectedAgent.id;
    } catch (error) {
      this.logger.error({ error, org_id: orgId, skill }, "Failed to find agent by skill");
      return null;
    }
  }

  private async setPriority(ticket: Ticket, priority: string) {
    try {
      await this.ticketServiceClient.patch(`/tickets/${ticket.id}`, {
        priority,
      }, {
        headers: {
          "X-Org-Id": ticket.org_id,
          "X-User-Id": "system",
        },
      });
      this.logger.info({ ticket_id: ticket.id, priority }, "Priority set");
    } catch (error: any) {
      this.logger.error(
        { error: error.response?.data || error.message, ticket_id: ticket.id },
        "Failed to set priority"
      );
      throw error;
    }
  }

  private async assignToBucket(ticket: Ticket, params: Record<string, unknown>) {
    try {
      let bucketId: string | null = null;

      // Support both bucket_id and bucket_name
      if (params.bucket_id) {
        bucketId = params.bucket_id as string;
      } else if (params.bucket_name) {
        // Fetch bucket by name
        const bucketsResponse = await axios.get(
          `${this.ticketServiceClient.defaults.baseURL}/buckets`,
          {
            headers: {
              "X-Org-Id": ticket.org_id,
              "X-User-Id": "system",
            },
          },
        );
        const buckets = bucketsResponse.data as Array<{ id: string; name: string }>;
        const bucket = buckets.find(
          (b) => b.name.toLowerCase() === (params.bucket_name as string).toLowerCase(),
        );
        if (bucket) {
          bucketId = bucket.id;
        } else {
          this.logger.warn(
            { bucket_name: params.bucket_name, ticket_id: ticket.id },
            "Bucket not found by name",
          );
          return;
        }
      }

      if (!bucketId) {
        this.logger.warn({ params, ticket_id: ticket.id }, "No bucket_id or bucket_name provided");
        return;
      }

      await this.ticketServiceClient.patch(
        `/tickets/${ticket.id}`,
        {
          bucket_id: bucketId,
        },
        {
          headers: {
            "X-Org-Id": ticket.org_id,
            "X-User-Id": "system",
          },
        },
      );
      this.logger.info({ ticket_id: ticket.id, bucket_id: bucketId }, "Bucket assigned");
    } catch (error: any) {
      this.logger.error(
        { error: error.response?.data || error.message, ticket_id: ticket.id },
        "Failed to assign bucket",
      );
      throw error;
    }
  }

  private async addObserver(ticket: Ticket, userIds: string[]) {
    try {
      for (const userId of userIds) {
        await this.ticketServiceClient.post(`/tickets/${ticket.id}/observers`, {
          user_ids: [userId],
        }, {
          headers: {
            "X-Org-Id": ticket.org_id,
            "X-User-Id": "system",
          },
        });
      }
      this.logger.info({ ticket_id: ticket.id, user_ids: userIds }, "Observers added");
    } catch (error: any) {
      this.logger.error(
        { error: error.response?.data || error.message, ticket_id: ticket.id },
        "Failed to add observers"
      );
      throw error;
    }
  }

  private async escalate(ticket: Ticket, params: Record<string, unknown>) {
    try {
      const updates: Record<string, unknown> = {};
      
      if (params.increase_priority) {
        const currentPriority = ticket.priority;
        const priorityMap: Record<string, string> = {
          low: "medium",
          medium: "high",
          high: "urgent",
        };
        updates.priority = priorityMap[currentPriority] || "high";
      }

      if (Object.keys(updates).length > 0) {
        await this.ticketServiceClient.patch(`/tickets/${ticket.id}`, updates, {
          headers: {
            "X-Org-Id": ticket.org_id,
            "X-User-Id": "system",
          },
        });
      }

      if (params.notify_supervisor) {
        await this.sendNotification(ticket, {
          recipients: ["supervisor"],
          template: "escalation",
        });
      }

      this.logger.info({ ticket_id: ticket.id }, "Ticket escalated");
    } catch (error: any) {
      this.logger.error(
        { error: error.response?.data || error.message, ticket_id: ticket.id },
        "Failed to escalate ticket"
      );
      throw error;
    }
  }

  private async closeTicket(ticket: Ticket, params: Record<string, unknown>) {
    try {
      await this.ticketServiceClient.patch(`/tickets/${ticket.id}`, {
        status: params.status || "closed",
      }, {
        headers: {
          "X-Org-Id": ticket.org_id,
          "X-User-Id": "system",
        },
      });

      if (params.notify) {
        await this.sendNotification(ticket, {
          recipients: ["customer"],
          template: "ticket_closed",
        });
      }

      this.logger.info({ ticket_id: ticket.id }, "Ticket closed");
    } catch (error: any) {
      this.logger.error(
        { error: error.response?.data || error.message, ticket_id: ticket.id },
        "Failed to close ticket"
      );
      throw error;
    }
  }

  private async setRequiredSkill(ticket: Ticket, skill: string) {
    try {
      await this.ticketServiceClient.patch(`/tickets/${ticket.id}`, {
        required_skill: skill,
      }, {
        headers: {
          "X-Org-Id": ticket.org_id,
          "X-User-Id": "system",
        },
      });
      this.logger.info({ ticket_id: ticket.id, skill }, "Required skill set");
    } catch (error: any) {
      this.logger.error(
        { error: error.response?.data || error.message, ticket_id: ticket.id },
        "Failed to set required skill"
      );
      throw error;
    }
  }

  private async sendNotification(ticket: Ticket, params: Record<string, unknown>) {
    // This is a placeholder - actual notification implementation would go here
    this.logger.info(
      { ticket_id: ticket.id, recipients: params.recipients, template: params.template },
      "Notification sent"
    );
  }
}





