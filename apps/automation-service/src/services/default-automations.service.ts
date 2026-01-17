import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Logger } from "@ticketing/logger";
import { automationRules } from "@ticketing/db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export class DefaultAutomationsService {
  constructor(
    private db: NodePgDatabase<typeof schema>,
    private logger: Logger,
  ) {}

  async initializeDefaults(orgId: string) {
    const defaults = this.getDefaultAutomations(orgId);
    const created = [];

    for (const rule of defaults) {
      // Check if default rule already exists
      const existing = await this.db
        .select()
        .from(automationRules)
        .where(
          and(
            eq(automationRules.org_id, orgId),
            eq(automationRules.name, rule.name),
            eq(automationRules.is_default, true),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        const [createdRule] = await this.db
          .insert(automationRules)
          .values({
            id: nanoid(),
            org_id: orgId,
            ...rule,
          })
          .returning();

        created.push(createdRule);
        this.logger.info({ rule_id: createdRule.id, org_id: orgId }, "Default automation created");
      }
    }

    return created;
  }

  async toggleDefault(orgId: string, ruleName: string, enabled: boolean) {
    const [rule] = await this.db
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.org_id, orgId),
          eq(automationRules.name, ruleName),
          eq(automationRules.is_default, true),
        ),
      )
      .limit(1);

    if (!rule) {
      throw new Error(`Default automation "${ruleName}" not found`);
    }

    const [updated] = await this.db
      .update(automationRules)
      .set({ enabled, updated_at: new Date() })
      .where(eq(automationRules.id, rule.id))
      .returning();

    return updated;
  }

  async getDefaults(orgId: string) {
    return await this.db
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.org_id, orgId),
          eq(automationRules.is_default, true),
        ),
      )
      .orderBy(automationRules.priority);
  }

  private getDefaultAutomations(orgId: string) {
    return [
      {
        name: "Auto-Assign by Skill",
        priority: 10,
        conditions: [
          { field: "required_skill", operator: "is_not_null", value: null },
        ],
        actions: [
          { type: "assign_agent", params: { strategy: "skill_match" } },
        ],
        enabled: true,
        is_default: true,
      },
      {
        name: "Auto-Set Priority by Urgent Keywords",
        priority: 5,
        conditions: [
          {
            field: "subject",
            operator: "contains",
            value: "urgent",
          },
        ],
        actions: [
          { type: "set_priority", params: { priority: "high" } },
        ],
        enabled: true,
        is_default: true,
      },
      {
        name: "Auto-Set Priority by Critical Keywords",
        priority: 5,
        conditions: [
          {
            field: "subject",
            operator: "contains",
            value: "critical",
          },
        ],
        actions: [
          { type: "set_priority", params: { priority: "urgent" } },
        ],
        enabled: true,
        is_default: true,
      },
      {
        name: "Auto-Set Priority by Outage Keywords",
        priority: 5,
        conditions: [
          {
            field: "subject",
            operator: "in",
            value: ["down", "outage", "broken", "not working"],
          },
        ],
        actions: [
          { type: "set_priority", params: { priority: "urgent" } },
        ],
        enabled: true,
        is_default: true,
      },
      {
        name: "SLA Breach Escalation",
        priority: 20,
        conditions: [
          { field: "sla_status", operator: "equals", value: "breached" },
        ],
        actions: [
          {
            type: "escalate",
            params: { notify_supervisor: true, increase_priority: true },
          },
          {
            type: "send_notification",
            params: { recipients: ["supervisor"], template: "sla_breach" },
          },
        ],
        enabled: true,
        is_default: true,
      },
      {
        name: "Auto-Assign Email Tickets to Bucket",
        priority: 3,
        conditions: [
          { field: "source", operator: "equals", value: "email" },
        ],
        actions: [
          { type: "assign_to_bucket", params: { bucket_id: null } }, // Needs configuration
        ],
        enabled: false, // Disabled by default, needs bucket_id configuration
        is_default: true,
      },
      {
        name: "Auto-Close Inactive Resolved Tickets",
        priority: 1,
        conditions: [
          { field: "status", operator: "equals", value: "resolved" },
          { field: "days_since_last_activity", operator: "greater_than", value: 7 },
        ],
        actions: [
          {
            type: "send_notification",
            params: { recipients: ["customer"], template: "auto_close_warning" },
          },
          { type: "close_ticket", params: { status: "closed", notify: true } },
        ],
        enabled: true,
        is_default: true,
      },
    ];
  }
}

