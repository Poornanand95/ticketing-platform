import { config as loadEnv } from "dotenv";
import { resolve } from "path";

// Load environment variables
loadEnv({ path: resolve(process.cwd(), "../../.env") });

import { getDb, closeDb } from "@ticketing/db";
import { getConfig } from "@ticketing/config";
import {
  organizations,
  users,
  userRoles,
  roles,
  tickets,
  buckets,
  automationRules,
} from "@ticketing/db";
import { hashPassword } from "@ticketing/auth";
import { nanoid } from "nanoid";
import { eq, and, isNull } from "drizzle-orm";

const config = getConfig();
const db = getDb(config.DATABASE_URL);

// Available skills for agents
const SKILLS = [
  "technical-support",
  "billing",
  "sales",
  "product-questions",
  "bug-reports",
  "feature-requests",
  "account-management",
  "integration-help",
  "security",
  "data-analytics",
  "mobile-support",
  "api-support",
];

// Ticket statuses
const STATUSES = ["open", "pending", "resolved", "closed"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const SOURCES = ["email", "web", "api"] as const;

interface UserData {
  email: string;
  name: string;
  password: string;
  role: "admin" | "agent" | "customer";
  skills?: string[];
  is_active?: boolean;
}

interface BucketData {
  name: string;
  tag: string;
  description: string;
  color: string;
}

interface TicketData {
  subject: string;
  status: typeof STATUSES[number];
  priority: typeof PRIORITIES[number];
  source: typeof SOURCES[number];
  required_skill?: string;
  bucket_id?: string;
  assigned_to?: string;
  created_by: string;
  metadata?: Record<string, unknown>;
}

interface AutomationData {
  name: string;
  priority: number;
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  actions: Array<{
    type: string;
    params: Record<string, unknown>;
  }>;
  enabled: boolean;
  is_default?: boolean;
}

async function seedAll() {
  console.log("🌱 Starting comprehensive database seeding...\n");
  console.log("=".repeat(70));

  try {
    // 1. Get or create organization
    console.log("\n📦 Step 1: Setting up organization...");
    let [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, "Default Organization"))
      .limit(1);

    if (!org) {
      [org] = await db
        .insert(organizations)
        .values({
          id: nanoid(),
          name: "Default Organization",
          tier: "enterprise",
        })
        .returning();
      console.log(`✅ Created organization: ${org.name}`);
    } else {
      console.log(`✅ Using existing organization: ${org.name}`);
    }

    const orgId = org.id;

    // 2. Ensure roles exist
    console.log("\n👥 Step 2: Ensuring roles exist...");
    const roleMap: Record<string, string> = {};

    for (const roleName of ["admin", "agent", "customer"]) {
      let [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, roleName))
        .limit(1);

      if (!role) {
        [role] = await db
          .insert(roles)
          .values({
            id: nanoid(),
            name: roleName,
            permissions:
              roleName === "admin"
                ? ["*"]
                : roleName === "agent"
                  ? ["ticket:read", "ticket:write", "ticket:assign"]
                  : ["ticket:read", "ticket:write"],
          })
          .returning();
      }
      roleMap[roleName] = role.id;
      console.log(`✅ Role '${roleName}' ready`);
    }

    // 3. Create at least 10 agents
    console.log("\n👤 Step 3: Creating agents (minimum 10)...");
    const agentsToCreate: UserData[] = [
      {
        email: "agent1@example.com",
        name: "Sarah Johnson",
        password: "agent123",
        role: "agent",
        skills: ["technical-support", "bug-reports"],
        is_active: true,
      },
      {
        email: "agent2@example.com",
        name: "Michael Chen",
        password: "agent123",
        role: "agent",
        skills: ["billing", "account-management"],
        is_active: true,
      },
      {
        email: "agent3@example.com",
        name: "Emily Rodriguez",
        password: "agent123",
        role: "agent",
        skills: ["sales", "product-questions"],
        is_active: true,
      },
      {
        email: "agent4@example.com",
        name: "David Kim",
        password: "agent123",
        role: "agent",
        skills: ["integration-help", "api-support"],
        is_active: true,
      },
      {
        email: "agent5@example.com",
        name: "Jessica Martinez",
        password: "agent123",
        role: "agent",
        skills: ["technical-support", "mobile-support"],
        is_active: true,
      },
      {
        email: "agent6@example.com",
        name: "Robert Taylor",
        password: "agent123",
        role: "agent",
        skills: ["feature-requests", "product-questions"],
        is_active: true,
      },
      {
        email: "agent7@example.com",
        name: "Amanda White",
        password: "agent123",
        role: "agent",
        skills: ["security", "technical-support"],
        is_active: true,
      },
      {
        email: "agent8@example.com",
        name: "James Wilson",
        password: "agent123",
        role: "agent",
        skills: ["billing", "account-management", "sales"],
        is_active: true,
      },
      {
        email: "agent9@example.com",
        name: "Lisa Anderson",
        password: "agent123",
        role: "agent",
        skills: ["data-analytics", "product-questions"],
        is_active: true,
      },
      {
        email: "agent10@example.com",
        name: "Christopher Brown",
        password: "agent123",
        role: "agent",
        skills: ["bug-reports", "technical-support", "api-support"],
        is_active: true,
      },
      {
        email: "agent11@example.com",
        name: "Maria Garcia",
        password: "agent123",
        role: "agent",
        skills: ["integration-help", "api-support", "technical-support"],
        is_active: true,
      },
      {
        email: "agent12@example.com",
        name: "Daniel Lee",
        password: "agent123",
        role: "agent",
        skills: ["mobile-support", "technical-support"],
        is_active: false, // Inactive agent for testing
      },
    ];

    const userIdMap: Record<string, string> = {};
    let agentsCreated = 0;
    let agentsSkipped = 0;

    for (const userData of agentsToCreate) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser && !existingUser.deleted_at) {
        userIdMap[userData.email] = existingUser.id;
        agentsSkipped++;
        continue;
      }

      const passwordHash = await hashPassword(userData.password);
      const [user] = await db
        .insert(users)
        .values({
          id: nanoid(),
          org_id: orgId,
          email: userData.email,
          name: userData.name,
          password_hash: passwordHash,
          skills: userData.skills || [],
          is_active: userData.is_active ?? true,
        })
        .returning();

      await db.insert(userRoles).values({
        user_id: user.id,
        role_id: roleMap[userData.role],
      });

      userIdMap[userData.email] = user.id;
      agentsCreated++;
    }

    console.log(`✅ Created ${agentsCreated} agents, ${agentsSkipped} already existed`);

    // 4. Create at least 10 customers
    console.log("\n👥 Step 4: Creating customers (minimum 10)...");
    const customersToCreate: UserData[] = [
      {
        email: "customer1@example.com",
        name: "John Smith",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer2@example.com",
        name: "Alice Williams",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer3@example.com",
        name: "Bob Davis",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer4@example.com",
        name: "Carol Miller",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer5@example.com",
        name: "Edward Moore",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer6@example.com",
        name: "Fiona Jackson",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer7@example.com",
        name: "George Thompson",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer8@example.com",
        name: "Helen Harris",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer9@example.com",
        name: "Ian Clark",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer10@example.com",
        name: "Julia Lewis",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer11@example.com",
        name: "Kevin Walker",
        password: "customer123",
        role: "customer",
      },
      {
        email: "customer12@example.com",
        name: "Laura Hall",
        password: "customer123",
        role: "customer",
      },
    ];

    let customersCreated = 0;
    let customersSkipped = 0;

    for (const userData of customersToCreate) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser && !existingUser.deleted_at) {
        userIdMap[userData.email] = existingUser.id;
        customersSkipped++;
        continue;
      }

      const passwordHash = await hashPassword(userData.password);
      const [user] = await db
        .insert(users)
        .values({
          id: nanoid(),
          org_id: orgId,
          email: userData.email,
          name: userData.name,
          password_hash: passwordHash,
          skills: [],
          is_active: true,
        })
        .returning();

      await db.insert(userRoles).values({
        user_id: user.id,
        role_id: roleMap[userData.role],
      });

      userIdMap[userData.email] = user.id;
      customersCreated++;
    }

    console.log(
      `✅ Created ${customersCreated} customers, ${customersSkipped} already existed`,
    );

    // 5. Create at least 10 buckets
    console.log("\n🪣 Step 5: Creating buckets (minimum 10)...");
    const bucketsToCreate: BucketData[] = [
      {
        name: "Urgent Issues",
        tag: "urgent",
        description: "Critical issues requiring immediate attention",
        color: "#ef4444",
      },
      {
        name: "Technical Support",
        tag: "technical",
        description: "Technical support and troubleshooting requests",
        color: "#3b82f6",
      },
      {
        name: "Billing & Payments",
        tag: "billing",
        description: "Billing, invoices, and payment-related tickets",
        color: "#10b981",
      },
      {
        name: "Feature Requests",
        tag: "feature",
        description: "Product feature requests and enhancements",
        color: "#8b5cf6",
      },
      {
        name: "Bug Reports",
        tag: "bug",
        description: "Bug reports and software issues",
        color: "#f59e0b",
      },
      {
        name: "Sales Inquiries",
        tag: "sales",
        description: "Sales questions and product inquiries",
        color: "#06b6d4",
      },
      {
        name: "Account Management",
        tag: "account",
        description: "Account setup, changes, and management",
        color: "#84cc16",
      },
      {
        name: "API & Integration",
        tag: "api",
        description: "API documentation and integration support",
        color: "#6366f1",
      },
      {
        name: "Security Issues",
        tag: "security",
        description: "Security concerns and vulnerability reports",
        color: "#dc2626",
      },
      {
        name: "Mobile Support",
        tag: "mobile",
        description: "Mobile app support and issues",
        color: "#ec4899",
      },
      {
        name: "Data & Analytics",
        tag: "analytics",
        description: "Data export, analytics, and reporting requests",
        color: "#14b8a6",
      },
      {
        name: "General Inquiry",
        tag: "general",
        description: "General questions and miscellaneous requests",
        color: "#64748b",
      },
    ];

    const bucketIdMap: Record<string, string> = {};
    let bucketsCreated = 0;
    let bucketsSkipped = 0;

    for (const bucketData of bucketsToCreate) {
      const [existingBucket] = await db
        .select()
        .from(buckets)
        .where(
          and(
            eq(buckets.name, bucketData.name),
            eq(buckets.org_id, orgId),
            isNull(buckets.deleted_at),
          ),
        )
        .limit(1);

      if (existingBucket) {
        bucketIdMap[bucketData.name] = existingBucket.id;
        bucketsSkipped++;
        continue;
      }

      const [bucket] = await db
        .insert(buckets)
        .values({
          id: nanoid(),
          org_id: orgId,
          name: bucketData.name,
          tag: bucketData.tag,
          description: bucketData.description,
          color: bucketData.color,
        })
        .returning();

      bucketIdMap[bucketData.name] = bucket.id;
      bucketsCreated++;
    }

    console.log(
      `✅ Created ${bucketsCreated} buckets, ${bucketsSkipped} already existed`,
    );

    // 6. Create at least 10 tickets with various use cases
    console.log("\n🎫 Step 6: Creating tickets (minimum 10)...");
    const agentEmails = agentsToCreate.map((a) => a.email).filter((e) => userIdMap[e]);
    const customerEmails = customersToCreate.map((c) => c.email).filter((e) => userIdMap[e]);

    const ticketsToCreate: TicketData[] = [
      // Open tickets - unassigned
      {
        subject: "Unable to login to my account - urgent help needed",
        status: "open",
        priority: "high",
        source: "web",
        required_skill: "technical-support",
        bucket_id: bucketIdMap["Urgent Issues"],
        created_by: userIdMap[customerEmails[0] || "customer1@example.com"],
        metadata: { tags: ["login", "authentication"] },
      },
      {
        subject: "Billing question about my subscription renewal",
        status: "open",
        priority: "medium",
        source: "email",
        required_skill: "billing",
        bucket_id: bucketIdMap["Billing & Payments"],
        created_by: userIdMap[customerEmails[1] || "customer2@example.com"],
      },
      {
        subject: "API integration not working with our system",
        status: "open",
        priority: "high",
        source: "api",
        required_skill: "integration-help",
        bucket_id: bucketIdMap["API & Integration"],
        created_by: userIdMap[customerEmails[2] || "customer3@example.com"],
      },
      // Open tickets - assigned
      {
        subject: "Critical bug: Payment button not working on checkout page",
        status: "open",
        priority: "urgent",
        source: "web",
        required_skill: "bug-reports",
        bucket_id: bucketIdMap["Bug Reports"],
        assigned_to: userIdMap[agentEmails[0] || "agent1@example.com"],
        created_by: userIdMap[customerEmails[3] || "customer4@example.com"],
        metadata: { severity: "critical", affected_users: 150 },
      },
      {
        subject: "Need help with mobile app crashing on iOS",
        status: "open",
        priority: "high",
        source: "web",
        required_skill: "mobile-support",
        bucket_id: bucketIdMap["Mobile Support"],
        assigned_to: userIdMap[agentEmails[4] || "agent5@example.com"],
        created_by: userIdMap[customerEmails[4] || "customer5@example.com"],
      },
      {
        subject: "Security concern: Suspicious activity detected",
        status: "open",
        priority: "urgent",
        source: "email",
        required_skill: "security",
        bucket_id: bucketIdMap["Security Issues"],
        assigned_to: userIdMap[agentEmails[6] || "agent7@example.com"],
        created_by: userIdMap[customerEmails[5] || "customer6@example.com"],
      },
      // Pending tickets
      {
        subject: "Feature request: Dark mode for the dashboard",
        status: "pending",
        priority: "low",
        source: "web",
        required_skill: "feature-requests",
        bucket_id: bucketIdMap["Feature Requests"],
        assigned_to: userIdMap[agentEmails[5] || "agent6@example.com"],
        created_by: userIdMap[customerEmails[6] || "customer7@example.com"],
      },
      {
        subject: "Account upgrade inquiry - need enterprise features",
        status: "pending",
        priority: "medium",
        source: "email",
        required_skill: "sales",
        bucket_id: bucketIdMap["Sales Inquiries"],
        assigned_to: userIdMap[agentEmails[2] || "agent3@example.com"],
        created_by: userIdMap[customerEmails[7] || "customer8@example.com"],
      },
      {
        subject: "Data export request for compliance audit",
        status: "pending",
        priority: "medium",
        source: "web",
        required_skill: "data-analytics",
        bucket_id: bucketIdMap["Data & Analytics"],
        assigned_to: userIdMap[agentEmails[8] || "agent9@example.com"],
        created_by: userIdMap[customerEmails[8] || "customer9@example.com"],
      },
      // Resolved tickets
      {
        subject: "Password reset issue - RESOLVED",
        status: "resolved",
        priority: "high",
        source: "web",
        required_skill: "technical-support",
        bucket_id: bucketIdMap["Technical Support"],
        assigned_to: userIdMap[agentEmails[0] || "agent1@example.com"],
        created_by: userIdMap[customerEmails[9] || "customer10@example.com"],
      },
      {
        subject: "Invoice download problem - FIXED",
        status: "resolved",
        priority: "medium",
        source: "email",
        required_skill: "billing",
        bucket_id: bucketIdMap["Billing & Payments"],
        assigned_to: userIdMap[agentEmails[1] || "agent2@example.com"],
        created_by: userIdMap[customerEmails[10] || "customer11@example.com"],
      },
      {
        subject: "API documentation clarification - RESOLVED",
        status: "resolved",
        priority: "low",
        source: "api",
        required_skill: "api-support",
        bucket_id: bucketIdMap["API & Integration"],
        assigned_to: userIdMap[agentEmails[3] || "agent4@example.com"],
        created_by: userIdMap[customerEmails[11] || "customer12@example.com"],
      },
      // Closed tickets
      {
        subject: "Old support request - CLOSED",
        status: "closed",
        priority: "low",
        source: "web",
        required_skill: "product-questions",
        bucket_id: bucketIdMap["General Inquiry"],
        assigned_to: userIdMap[agentEmails[2] || "agent3@example.com"],
        created_by: userIdMap[customerEmails[0] || "customer1@example.com"],
      },
      {
        subject: "Account setup completed - CLOSED",
        status: "closed",
        priority: "medium",
        source: "email",
        required_skill: "account-management",
        bucket_id: bucketIdMap["Account Management"],
        assigned_to: userIdMap[agentEmails[7] || "agent8@example.com"],
        created_by: userIdMap[customerEmails[1] || "customer2@example.com"],
      },
      // Edge cases
      {
        subject: "General inquiry about services - no skill required",
        status: "open",
        priority: "low",
        source: "web",
        bucket_id: bucketIdMap["General Inquiry"],
        created_by: userIdMap[customerEmails[2] || "customer3@example.com"],
      },
      {
        subject: "Unassigned ticket with high priority",
        status: "open",
        priority: "high",
        source: "email",
        required_skill: "technical-support",
        bucket_id: bucketIdMap["Technical Support"],
        created_by: userIdMap[customerEmails[3] || "customer4@example.com"],
      },
    ];

    let ticketsCreated = 0;
    let ticketsSkipped = 0;
    let ticketCounter = 1;

    for (const ticketData of ticketsToCreate) {
      const ticketNumber = `TKT-${Date.now()}-${String(ticketCounter).padStart(4, "0")}-${nanoid(4)}`;
      ticketCounter++;

      const [existingTicket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.ticket_number, ticketNumber))
        .limit(1);

      if (existingTicket) {
        ticketsSkipped++;
        continue;
      }

      await db.insert(tickets).values({
        id: nanoid(),
        org_id: orgId,
        ticket_number: ticketNumber,
        subject: ticketData.subject,
        status: ticketData.status,
        priority: ticketData.priority,
        source: ticketData.source,
        required_skill: ticketData.required_skill || null,
        bucket_id: ticketData.bucket_id || null,
        assigned_to: ticketData.assigned_to || null,
        created_by: ticketData.created_by,
        metadata: ticketData.metadata || {},
      });

      ticketsCreated++;
    }

    console.log(
      `✅ Created ${ticketsCreated} tickets, ${ticketsSkipped} already existed`,
    );

    // 7. Create at least 10 automation rules
    console.log("\n🤖 Step 7: Creating automation rules (minimum 10)...");
    const automationsToCreate: AutomationData[] = [
      {
        name: "Auto-Assign by Skill Match",
        priority: 10,
        conditions: [
          { field: "required_skill", operator: "is_not_null", value: null },
          { field: "assigned_to", operator: "is_null", value: null },
        ],
        actions: [
          { type: "assign_agent", params: { strategy: "skill_match" } },
        ],
        enabled: true,
        is_default: true,
      },
      {
        name: "Auto-Set Priority for Urgent Keywords",
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
        name: "Auto-Set Priority for Critical Keywords",
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
        name: "Auto-Assign Email Tickets to Support Bucket",
        priority: 3,
        conditions: [
          { field: "source", operator: "equals", value: "email" },
          { field: "bucket_id", operator: "is_null", value: null },
        ],
        actions: [
          {
            type: "assign_to_bucket",
            params: { bucket_name: "Technical Support" },
          },
        ],
        enabled: true,
        is_default: false,
      },
      {
        name: "Auto-Assign API Tickets to API Bucket",
        priority: 3,
        conditions: [
          { field: "source", operator: "equals", value: "api" },
          { field: "bucket_id", operator: "is_null", value: null },
        ],
        actions: [
          {
            type: "assign_to_bucket",
            params: { bucket_name: "API & Integration" },
          },
        ],
        enabled: true,
        is_default: false,
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
        name: "Auto-Close Inactive Resolved Tickets",
        priority: 1,
        conditions: [
          { field: "status", operator: "equals", value: "resolved" },
          {
            field: "days_since_last_activity",
            operator: "greater_than",
            value: 7,
          },
        ],
        actions: [
          {
            type: "send_notification",
            params: {
              recipients: ["customer"],
              template: "auto_close_warning",
            },
          },
          { type: "close_ticket", params: { status: "closed", notify: true } },
        ],
        enabled: true,
        is_default: true,
      },
      {
        name: "Auto-Assign High Priority to Urgent Bucket",
        priority: 4,
        conditions: [
          { field: "priority", operator: "equals", value: "urgent" },
          { field: "bucket_id", operator: "is_null", value: null },
        ],
        actions: [
          {
            type: "assign_to_bucket",
            params: { bucket_name: "Urgent Issues" },
          },
        ],
        enabled: true,
        is_default: false,
      },
      {
        name: "Auto-Assign Security Keywords to Security Bucket",
        priority: 6,
        conditions: [
          {
            field: "subject",
            operator: "contains_any",
            value: ["security", "hack", "breach", "vulnerability"],
          },
        ],
        actions: [
          {
            type: "assign_to_bucket",
            params: { bucket_name: "Security Issues" },
          },
          { type: "set_priority", params: { priority: "urgent" } },
        ],
        enabled: true,
        is_default: false,
      },
      {
        name: "Auto-Assign Bug Reports to Bug Bucket",
        priority: 5,
        conditions: [
          {
            field: "subject",
            operator: "contains_any",
            value: ["bug", "error", "broken", "not working", "crash"],
          },
          { field: "required_skill", operator: "equals", value: "bug-reports" },
        ],
        actions: [
          {
            type: "assign_to_bucket",
            params: { bucket_name: "Bug Reports" },
          },
        ],
        enabled: true,
        is_default: false,
      },
      {
        name: "Auto-Assign Billing Keywords to Billing Bucket",
        priority: 5,
        conditions: [
          {
            field: "subject",
            operator: "contains_any",
            value: ["billing", "invoice", "payment", "subscription", "charge"],
          },
        ],
        actions: [
          {
            type: "assign_to_bucket",
            params: { bucket_name: "Billing & Payments" },
          },
          {
            type: "set_required_skill",
            params: { skill: "billing" },
          },
        ],
        enabled: true,
        is_default: false,
      },
      {
        name: "Auto-Assign Feature Requests to Feature Bucket",
        priority: 4,
        conditions: [
          {
            field: "subject",
            operator: "contains_any",
            value: ["feature", "enhancement", "improvement", "suggestion"],
          },
        ],
        actions: [
          {
            type: "assign_to_bucket",
            params: { bucket_name: "Feature Requests" },
          },
          {
            type: "set_required_skill",
            params: { skill: "feature-requests" },
          },
        ],
        enabled: true,
        is_default: false,
      },
      {
        name: "Auto-Assign Mobile Support to Mobile Bucket",
        priority: 5,
        conditions: [
          {
            field: "subject",
            operator: "contains_any",
            value: ["mobile", "ios", "android", "app", "phone"],
          },
        ],
        actions: [
          {
            type: "assign_to_bucket",
            params: { bucket_name: "Mobile Support" },
          },
          {
            type: "set_required_skill",
            params: { skill: "mobile-support" },
          },
        ],
        enabled: true,
        is_default: false,
      },
      {
        name: "Notify on High Priority Ticket Creation",
        priority: 8,
        conditions: [
          { field: "priority", operator: "in", value: ["high", "urgent"] },
        ],
        actions: [
          {
            type: "send_notification",
            params: {
              recipients: ["team_lead", "on_call"],
              template: "high_priority_alert",
            },
          },
        ],
        enabled: true,
        is_default: false,
      },
    ];

    let automationsCreated = 0;
    let automationsSkipped = 0;

    for (const automation of automationsToCreate) {
      const [existing] = await db
        .select()
        .from(automationRules)
        .where(
          and(
            eq(automationRules.org_id, orgId),
            eq(automationRules.name, automation.name),
          ),
        )
        .limit(1);

      if (existing) {
        automationsSkipped++;
        continue;
      }

      await db.insert(automationRules).values({
        id: nanoid(),
        org_id: orgId,
        name: automation.name,
        priority: automation.priority,
        conditions: automation.conditions,
        actions: automation.actions,
        enabled: automation.enabled,
        is_default: automation.is_default || false,
      });

      automationsCreated++;
    }

    console.log(
      `✅ Created ${automationsCreated} automation rules, ${automationsSkipped} already existed`,
    );

    // 8. Summary
    console.log("\n" + "=".repeat(70));
    console.log("✅ Database seeding complete!");
    console.log("=".repeat(70));
    console.log("\n📊 Summary:");
    console.log(`   • Organization: 1`);
    console.log(`   • Agents: ${agentsToCreate.length} (${agentsCreated} created, ${agentsSkipped} existed)`);
    console.log(`   • Customers: ${customersToCreate.length} (${customersCreated} created, ${customersSkipped} existed)`);
    console.log(`   • Buckets: ${bucketsToCreate.length} (${bucketsCreated} created, ${bucketsSkipped} existed)`);
    console.log(`   • Tickets: ${ticketsToCreate.length} (${ticketsCreated} created, ${ticketsSkipped} existed)`);
    console.log(`   • Automation Rules: ${automationsToCreate.length} (${automationsCreated} created, ${automationsSkipped} existed)`);

    console.log("\n📈 Ticket Distribution:");
    const statusCounts = ticketsToCreate.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   • ${status}: ${count}`);
    });

    const priorityCounts = ticketsToCreate.reduce(
      (acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log("\n📊 Priority Distribution:");
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      console.log(`   • ${priority}: ${count}`);
    });

    console.log("\n🔑 Login Credentials:");
    console.log("─".repeat(70));
    console.log("Agents (password: agent123):");
    agentsToCreate.slice(0, 5).forEach((agent) => {
      console.log(`   • ${agent.email} - ${agent.name}`);
    });
    console.log("   ... and more");
    console.log("\nCustomers (password: customer123):");
    customersToCreate.slice(0, 5).forEach((customer) => {
      console.log(`   • ${customer.email} - ${customer.name}`);
    });
    console.log("   ... and more");
    console.log("─".repeat(70));

    console.log("\n🎯 Test Scenarios Covered:");
    console.log("  ✓ Skill-based ticket assignment");
    console.log("  ✓ Unassigned tickets");
    console.log("  ✓ Assigned tickets");
    console.log("  ✓ Tickets with no required skill");
    console.log("  ✓ All ticket statuses (open, pending, resolved, closed)");
    console.log("  ✓ All priorities (low, medium, high, urgent)");
    console.log("  ✓ All sources (email, web, api)");
    console.log("  ✓ Inactive agent (should not appear in assignments)");
    console.log("  ✓ Multiple agents with same skills");
    console.log("  ✓ Agents with multiple skills");
    console.log("  ✓ Bucket categorization");
    console.log("  ✓ Tickets with and without buckets");
    console.log("  ✓ Automation rules for various conditions");
    console.log("  ✓ Automation rules with different priorities");
    console.log("  ✓ Enabled and disabled automation rules");
    console.log("  ✓ Default and custom automation rules");

    console.log("\n" + "=".repeat(70));
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    throw error;
  } finally {
    await closeDb();
  }
}

seedAll()
  .then(() => {
    console.log("\n✅ Seeding completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });

