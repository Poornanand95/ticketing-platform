import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { getDb } from "@ticketing/db";
import { getConfig } from "@ticketing/config";
import { organizations, users, tickets, ticketObservers } from "@ticketing/db";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

const config = getConfig();
const db = getDb(config.DATABASE_URL);

const STATUSES = ["open", "pending", "resolved", "closed"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const SOURCES = ["email", "web", "api"] as const;

interface TicketData {
  subject: string;
  status: typeof STATUSES[number];
  priority: typeof PRIORITIES[number];
  source: typeof SOURCES[number];
  required_skill?: string | null;
  assigned_to?: string | null;
  created_by: string;
  observer_ids?: string[];
  metadata?: Record<string, unknown>;
}

async function seedTickets() {
  console.log("🎫 Starting ticket seeding (20 tickets)...\n");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, "Default Organization"))
    .limit(1);

  if (!org) {
    console.error("❌ Organization not found. Please run 'pnpm setup' first.");
    process.exit(1);
  }

  const orgId = org.id;

  const allUsers = await db
    .select()
    .from(users)
    .where(eq(users.org_id, orgId));

  if (allUsers.length === 0) {
    console.error("❌ No users found. Please run 'pnpm setup' first.");
    process.exit(1);
  }

  const customers = allUsers.filter((u) => !u.deleted_at);
  const agents = allUsers.filter((u) => !u.deleted_at);

  if (customers.length === 0) {
    console.error("❌ No customers found. Please run 'pnpm setup' first.");
    process.exit(1);
  }

  const customerIds = customers.map((u) => u.id);
  const agentIds = agents.map((u) => u.id);

  const getCustomerId = (index: number) => customerIds[index % customerIds.length];
  const getAgentId = (index: number) => (agentIds.length > 0 ? agentIds[index % agentIds.length] : null);

  const ticketsToCreate: TicketData[] = [
    {
      subject: "Critical system outage affecting all users",
      status: "open",
      priority: "urgent",
      source: "email",
      required_skill: "technical-support",
      assigned_to: getAgentId(0),
      created_by: getCustomerId(0),
      observer_ids: agentIds.length > 1 ? [getAgentId(1), getAgentId(2)].filter(Boolean) : [],
      metadata: { category: "incident", impact: "high" },
    },
    {
      subject: "Payment processing error on checkout page",
      status: "open",
      priority: "high",
      source: "web",
      required_skill: "bug-reports",
      assigned_to: getAgentId(1),
      created_by: getCustomerId(1),
      metadata: { browser: "Chrome", page: "/checkout" },
    },
    {
      subject: "Billing inquiry about subscription renewal",
      status: "open",
      priority: "medium",
      source: "email",
      required_skill: "billing",
      assigned_to: null,
      created_by: getCustomerId(2),
      metadata: { subscription_tier: "pro" },
    },
    {
      subject: "Feature request: Add dark mode support",
      status: "open",
      priority: "low",
      source: "web",
      required_skill: "feature-requests",
      assigned_to: null,
      created_by: getCustomerId(3),
      metadata: { votes: 15, category: "ui" },
    },
    {
      subject: "API integration documentation needed",
      status: "pending",
      priority: "medium",
      source: "api",
      required_skill: "integration-help",
      assigned_to: getAgentId(2),
      created_by: getCustomerId(0),
      metadata: { api_version: "v2", endpoint: "/users" },
    },
    {
      subject: "Account upgrade request to enterprise plan",
      status: "pending",
      priority: "high",
      source: "email",
      required_skill: "sales",
      assigned_to: getAgentId(3),
      created_by: getCustomerId(1),
      observer_ids: agentIds.length > 0 ? [getAgentId(0)].filter(Boolean) : [],
      metadata: { current_tier: "pro", requested_tier: "enterprise" },
    },
    {
      subject: "Password reset not working via email",
      status: "pending",
      priority: "urgent",
      source: "web",
      required_skill: "technical-support",
      assigned_to: getAgentId(0),
      created_by: getCustomerId(2),
      metadata: { issue_type: "authentication" },
    },
    {
      subject: "Invoice download link expired",
      status: "resolved",
      priority: "medium",
      source: "email",
      required_skill: "billing",
      assigned_to: getAgentId(1),
      created_by: getCustomerId(3),
      metadata: { resolution: "new_link_sent", resolved_at: new Date().toISOString() },
    },
    {
      subject: "Product question about pricing tiers",
      status: "resolved",
      priority: "low",
      source: "web",
      required_skill: "product-questions",
      assigned_to: getAgentId(2),
      created_by: getCustomerId(0),
      metadata: { question_type: "pricing" },
    },
    {
      subject: "Bug: Dashboard not loading user data",
      status: "resolved",
      priority: "high",
      source: "api",
      required_skill: "bug-reports",
      assigned_to: getAgentId(3),
      created_by: getCustomerId(1),
      metadata: { component: "dashboard", fixed_in: "v1.2.3" },
    },
    {
      subject: "Old support ticket - no longer needed",
      status: "closed",
      priority: "low",
      source: "web",
      required_skill: null,
      assigned_to: getAgentId(0),
      created_by: getCustomerId(2),
      metadata: { closed_reason: "resolved_by_user" },
    },
    {
      subject: "Account management: Update company information",
      status: "closed",
      priority: "medium",
      source: "email",
      required_skill: "account-management",
      assigned_to: getAgentId(1),
      created_by: getCustomerId(3),
      metadata: { action: "company_info_updated" },
    },
    {
      subject: "General inquiry about service availability",
      status: "open",
      priority: "low",
      source: "web",
      required_skill: null,
      assigned_to: null,
      created_by: getCustomerId(0),
      metadata: { inquiry_type: "general" },
    },
    {
      subject: "Urgent: Data export failing for large datasets",
      status: "open",
      priority: "urgent",
      source: "api",
      required_skill: "technical-support",
      assigned_to: getAgentId(2),
      created_by: getCustomerId(1),
      metadata: { dataset_size: "10GB", error_code: "EXPORT_001" },
    },
    {
      subject: "Sales inquiry: Enterprise pricing and features",
      status: "pending",
      priority: "high",
      source: "email",
      required_skill: "sales",
      assigned_to: getAgentId(3),
      created_by: getCustomerId(2),
      metadata: { lead_source: "website", company_size: "500+" },
    },
    {
      subject: "Integration help: Webhook configuration",
      status: "pending",
      priority: "medium",
      source: "api",
      required_skill: "integration-help",
      assigned_to: null,
      created_by: getCustomerId(3),
      metadata: { integration_type: "webhook", provider: "stripe" },
    },
    {
      subject: "Resolved: Email notification preferences",
      status: "resolved",
      priority: "low",
      source: "web",
      required_skill: "account-management",
      assigned_to: getAgentId(0),
      created_by: getCustomerId(0),
      metadata: { setting: "email_notifications", value: "enabled" },
    },
    {
      subject: "Closed: Feature request implemented",
      status: "closed",
      priority: "medium",
      source: "web",
      required_skill: "feature-requests",
      assigned_to: getAgentId(1),
      created_by: getCustomerId(1),
      metadata: { feature: "export_to_csv", implemented_in: "v1.3.0" },
    },
    {
      subject: "High priority: Security vulnerability report",
      status: "open",
      priority: "urgent",
      source: "email",
      required_skill: "bug-reports",
      assigned_to: getAgentId(2),
      created_by: getCustomerId(2),
      observer_ids: agentIds.length > 2 ? [getAgentId(0), getAgentId(1), getAgentId(3)].filter(Boolean) : [],
      metadata: { severity: "critical", cve_id: "CVE-2024-XXXX" },
    },
    {
      subject: "Low priority: UI improvement suggestion",
      status: "open",
      priority: "low",
      source: "web",
      required_skill: "feature-requests",
      assigned_to: null,
      created_by: getCustomerId(3),
      metadata: { component: "sidebar", suggestion: "add_collapse_button" },
    },
  ];

  let created = 0;
  let skipped = 0;
  let counter = 1;

  for (const ticketData of ticketsToCreate) {
    const ticketNumber = `TKT-${Date.now()}-${String(counter).padStart(3, "0")}-${nanoid(4)}`;
    counter++;

    const [ticket] = await db.insert(tickets).values({
      id: nanoid(),
      org_id: orgId,
      ticket_number: ticketNumber,
      subject: ticketData.subject,
      status: ticketData.status,
      priority: ticketData.priority,
      source: ticketData.source,
      required_skill: ticketData.required_skill || null,
      assigned_to: ticketData.assigned_to || null,
      created_by: ticketData.created_by,
      metadata: ticketData.metadata || {},
    }).returning();

    if (ticketData.observer_ids && ticketData.observer_ids.length > 0) {
      await db.insert(ticketObservers).values(
        ticketData.observer_ids.map((user_id) => ({
          ticket_id: ticket.id,
          user_id,
        })),
      );
    }

    const assignmentInfo = ticketData.assigned_to ? " (assigned)" : " (unassigned)";
    const skillInfo = ticketData.required_skill ? ` [${ticketData.required_skill}]` : "";
    const observerInfo = ticketData.observer_ids && ticketData.observer_ids.length > 0
      ? ` [${ticketData.observer_ids.length} observer(s)]`
      : "";
    console.log(
      `✅ Created: ${ticketNumber} - ${ticketData.status}/${ticketData.priority}/${ticketData.source}${assignmentInfo}${skillInfo}${observerInfo}`,
    );
    created++;
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Ticket seeding complete!");
  console.log("=".repeat(60));
  console.log("\n📊 Summary:");
  console.log(`   • Tickets created: ${created}`);
  console.log(`   • Tickets skipped: ${skipped}`);
  console.log("\n📈 Distribution:");

  const statusCounts = ticketsToCreate.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log(`   • Status:`);
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`     - ${status}: ${count}`);
  });

  const priorityCounts = ticketsToCreate.reduce(
    (acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log(`   • Priority:`);
  Object.entries(priorityCounts).forEach(([priority, count]) => {
    console.log(`     - ${priority}: ${count}`);
  });

  const sourceCounts = ticketsToCreate.reduce(
    (acc, t) => {
      acc[t.source] = (acc[t.source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log(`   • Source:`);
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`     - ${source}: ${count}`);
  });

  const assignedCount = ticketsToCreate.filter((t) => t.assigned_to).length;
  const unassignedCount = ticketsToCreate.length - assignedCount;
  console.log(`   • Assignment:`);
  console.log(`     - Assigned: ${assignedCount}`);
  console.log(`     - Unassigned: ${unassignedCount}`);

  const withSkillCount = ticketsToCreate.filter((t) => t.required_skill).length;
  const withoutSkillCount = ticketsToCreate.length - withSkillCount;
  console.log(`   • Skills:`);
  console.log(`     - With required skill: ${withSkillCount}`);
  console.log(`     - Without required skill: ${withoutSkillCount}`);

  const withObserversCount = ticketsToCreate.filter((t) => t.observer_ids && t.observer_ids.length > 0).length;
  const withoutObserversCount = ticketsToCreate.length - withObserversCount;
  console.log(`   • Observers:`);
  console.log(`     - With observers: ${withObserversCount}`);
  console.log(`     - Without observers: ${withoutObserversCount}`);

  console.log("\n🎯 Filtering Test Coverage:");
  console.log("   ✓ All statuses: open, pending, resolved, closed");
  console.log("   ✓ All priorities: low, medium, high, urgent");
  console.log("   ✓ All sources: email, web, api");
  console.log("   ✓ Assigned and unassigned tickets");
  console.log("   ✓ Tickets with and without required skills");
  console.log("   ✓ Tickets with observers");
  console.log("   ✓ Various metadata configurations");
  console.log("   ✓ Different created_by users");

  process.exit(0);
}

seedTickets().catch((error) => {
  console.error("❌ Ticket seeding failed:", error);
  process.exit(1);
});

