import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), "../../.env") });

import { getConfig } from "@ticketing/config";
import { getDb, closeDb } from "@ticketing/db";
import { automationRules, organizations } from "@ticketing/db";
import { eq, and, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

const config = getConfig();
const db = getDb(config.DATABASE_URL);

async function seedAutomations() {
  console.log("🤖 Seeding default automation rules...\n");

  try {
    // Get all organizations
    const orgs = await db
      .select()
      .from(organizations)
      .where(isNull(organizations.deleted_at));

    if (orgs.length === 0) {
      console.error("❌ No organizations found. Please run 'pnpm setup' first.");
      process.exit(1);
    }

    console.log(`Found ${orgs.length} organization(s)\n`);

    for (const org of orgs) {
      console.log(`📦 Seeding automations for: ${org.name} (${org.id})`);

      const defaultAutomations = [
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

      let createdCount = 0;
      let skippedCount = 0;

      for (const automation of defaultAutomations) {
        // Check if this default automation already exists
        const [existing] = await db
          .select()
          .from(automationRules)
          .where(
            and(
              eq(automationRules.org_id, org.id),
              eq(automationRules.name, automation.name),
              eq(automationRules.is_default, true),
            ),
          )
          .limit(1);

        if (existing) {
          console.log(`   ⏭️  Skipped: ${automation.name} (already exists)`);
          skippedCount++;
          continue;
        }

        const ruleResult = await db
          .insert(automationRules)
          .values({
            id: nanoid(),
            org_id: org.id,
            ...automation,
          })
          .returning();

        const rule = Array.isArray(ruleResult) ? ruleResult[0] : null;
        if (rule) {
          console.log(
            `   ✅ Created: ${automation.name} (${rule.enabled ? "enabled" : "disabled"})`
          );
          createdCount++;
        }
      }

      console.log(
        `   📊 Summary: ${createdCount} created, ${skippedCount} skipped\n`
      );
    }

    console.log("✅ Automation seeding complete!");
  } catch (error) {
    console.error("❌ Failed to seed automations:", error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

seedAutomations();

