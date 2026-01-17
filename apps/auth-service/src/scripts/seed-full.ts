import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { getDb } from "@ticketing/db";
import { getConfig } from "@ticketing/config";
import { organizations, users, userRoles, roles, tickets, buckets } from "@ticketing/db";
import { hashPassword } from "@ticketing/auth";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

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

interface TicketData {
  subject: string;
  status: typeof STATUSES[number];
  priority: typeof PRIORITIES[number];
  source: typeof SOURCES[number];
  required_skill?: string;
  bucket_id?: string;
  assigned_to?: string;
  created_by: string;
  ticket_number: string;
}

async function seedFull() {
  console.log("🌱 Starting comprehensive database seeding...\n");

  // 1. Get or create organization
  console.log("📦 Setting up organization...");
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
        tier: "pro",
      })
      .returning();
    console.log(`✅ Created organization: ${org.name}`);
  } else {
    console.log(`✅ Using existing organization: ${org.name}`);
  }

  const orgId = org.id;

  // 2. Ensure roles exist
  console.log("\n👥 Ensuring roles exist...");
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

  // 3. Create users
  console.log("\n👤 Creating users...");

  const usersToCreate: UserData[] = [
    // Admins
    {
      email: "admin@example.com",
      name: "Admin User",
      password: "admin123",
      role: "admin",
    },
    {
      email: "admin2@example.com",
      name: "Secondary Admin",
      password: "admin123",
      role: "admin",
    },
    // Manager (agent with management skills)
    {
      email: "manager@example.com",
      name: "Manager User",
      password: "manager123",
      role: "agent",
      skills: ["account-management", "technical-support", "billing"],
      is_active: true,
    },
    // Agents with different skills
    {
      email: "agent@example.com",
      name: "Agent User",
      password: "agent123",
      role: "agent",
      skills: ["technical-support", "bug-reports"],
      is_active: true,
    },
    {
      email: "agent2@example.com",
      name: "Billing Agent",
      password: "agent123",
      role: "agent",
      skills: ["billing", "account-management"],
      is_active: true,
    },
    {
      email: "agent3@example.com",
      name: "Sales Agent",
      password: "agent123",
      role: "agent",
      skills: ["sales", "product-questions"],
      is_active: true,
    },
    {
      email: "agent4@example.com",
      name: "Support Agent",
      password: "agent123",
      role: "agent",
      skills: ["technical-support", "integration-help"],
      is_active: true,
    },
    // Inactive agent (for testing)
    {
      email: "agent-inactive@example.com",
      name: "Inactive Agent",
      password: "agent123",
      role: "agent",
      skills: ["technical-support"],
      is_active: false,
    },
    // Customers
    {
      email: "customer@example.com",
      name: "Customer User",
      password: "customer123",
      role: "customer",
    },
    {
      email: "customer2@example.com",
      name: "Premium Customer",
      password: "customer123",
      role: "customer",
    },
    {
      email: "customer3@example.com",
      name: "Enterprise Customer",
      password: "customer123",
      role: "customer",
    },
    {
      email: "customer4@example.com",
      name: "Regular Customer",
      password: "customer123",
      role: "customer",
    },
  ];

  const userIdMap: Record<string, string> = {};

  for (const userData of usersToCreate) {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUser && !existingUser.deleted_at) {
      console.log(`ℹ️  User already exists: ${userData.email}`);
      userIdMap[userData.email] = existingUser.id;
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
    console.log(`✅ Created ${userData.role}: ${userData.email}`);
  }

  // 4. Create buckets
  console.log("\n🪣 Creating buckets...");

  const bucketsToCreate = [
    { name: "Urgent", tag: "urgent", description: "High priority issues requiring immediate attention", color: "#ef4444" },
    { name: "Technical Support", tag: "technical", description: "Technical support requests", color: "#3b82f6" },
    { name: "Billing", tag: "billing", description: "Billing and payment related tickets", color: "#10b981" },
    { name: "Feature Requests", tag: "feature", description: "Product feature requests", color: "#8b5cf6" },
    { name: "Bug Reports", tag: "bug", description: "Bug reports and issues", color: "#f59e0b" },
  ];

  const bucketIdMap: Record<string, string> = {};

  for (const bucketData of bucketsToCreate) {
    const [existingBucket] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.name, bucketData.name))
      .limit(1);

    if (existingBucket && !existingBucket.deleted_at) {
      console.log(`ℹ️  Bucket already exists: ${bucketData.name}`);
      bucketIdMap[bucketData.name] = existingBucket.id;
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
    console.log(`✅ Created bucket: ${bucketData.name}`);
  }

  // 5. Create tickets
  console.log("\n🎫 Creating tickets...");

  const ticketsToCreate: TicketData[] = [
    // Open tickets - unassigned
    {
      subject: "Unable to login to my account",
      status: "open",
      priority: "high",
      source: "web",
      required_skill: "technical-support",
      bucket_id: bucketIdMap["Technical Support"],
      ticket_number: `TKT-${Date.now()}-1`,
      created_by: userIdMap["customer@example.com"],
    },
    {
      subject: "Billing question about my subscription",
      status: "open",
      priority: "medium",
      source: "email",
      required_skill: "billing",
      bucket_id: bucketIdMap["Billing"],
      ticket_number: `TKT-${Date.now()}-2`,
      created_by: userIdMap["customer2@example.com"],
    },
    // Open tickets - assigned
    {
      subject: "Bug: Payment button not working",
      status: "open",
      priority: "urgent",
      source: "web",
      required_skill: "bug-reports",
      bucket_id: bucketIdMap["Urgent"],
      assigned_to: userIdMap["agent@example.com"],
      ticket_number: `TKT-${Date.now()}-3`,
      created_by: userIdMap["customer3@example.com"],
    },
    {
      subject: "Need help with API integration",
      status: "open",
      priority: "medium",
      source: "api",
      required_skill: "integration-help",
      bucket_id: bucketIdMap["Technical Support"],
      assigned_to: userIdMap["agent4@example.com"],
      ticket_number: `TKT-${Date.now()}-4`,
      created_by: userIdMap["customer4@example.com"],
    },
    // Pending tickets
    {
      subject: "Feature request: Dark mode",
      status: "pending",
      priority: "low",
      source: "web",
      required_skill: "feature-requests",
      bucket_id: bucketIdMap["Feature Requests"],
      assigned_to: userIdMap["agent3@example.com"],
      ticket_number: `TKT-${Date.now()}-5`,
      created_by: userIdMap["customer@example.com"],
    },
    {
      subject: "Account upgrade inquiry",
      status: "pending",
      priority: "medium",
      source: "email",
      required_skill: "sales",
      bucket_id: bucketIdMap["Billing"],
      assigned_to: userIdMap["agent3@example.com"],
      ticket_number: `TKT-${Date.now()}-6`,
      created_by: userIdMap["customer2@example.com"],
    },
    // Resolved tickets
    {
      subject: "Password reset issue - RESOLVED",
      status: "resolved",
      priority: "high",
      source: "web",
      required_skill: "technical-support",
      bucket_id: bucketIdMap["Technical Support"],
      assigned_to: userIdMap["agent@example.com"],
      ticket_number: `TKT-${Date.now()}-7`,
      created_by: userIdMap["customer3@example.com"],
    },
    {
      subject: "Invoice download problem - FIXED",
      status: "resolved",
      priority: "medium",
      source: "email",
      required_skill: "billing",
      bucket_id: bucketIdMap["Billing"],
      assigned_to: userIdMap["agent2@example.com"],
      ticket_number: `TKT-${Date.now()}-8`,
      created_by: userIdMap["customer4@example.com"],
    },
    // Closed tickets
    {
      subject: "Old support request - CLOSED",
      status: "closed",
      priority: "low",
      source: "web",
      required_skill: "product-questions",
      bucket_id: bucketIdMap["Feature Requests"],
      assigned_to: userIdMap["agent3@example.com"],
      ticket_number: `TKT-${Date.now()}-9`,
      created_by: userIdMap["customer@example.com"],
    },
    // Unassigned ticket with no required skill and no bucket
    {
      subject: "General inquiry about services",
      status: "open",
      priority: "low",
      source: "web",
      ticket_number: `TKT-${Date.now()}-10`,
      created_by: userIdMap["customer2@example.com"],
    },
  ];

  for (const ticketData of ticketsToCreate) {
    const [existingTicket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.ticket_number, ticketData.ticket_number))
      .limit(1);

    if (existingTicket) {
      console.log(`ℹ️  Ticket already exists: ${ticketData.ticket_number}`);
      continue;
    }

    await db.insert(tickets)      .values({
        id: nanoid(),
        org_id: orgId,
        ticket_number: ticketData.ticket_number,
        subject: ticketData.subject,
        status: ticketData.status,
        priority: ticketData.priority,
        source: ticketData.source,
        required_skill: ticketData.required_skill || null,
        bucket_id: ticketData.bucket_id || null,
        assigned_to: ticketData.assigned_to || null,
        created_by: ticketData.created_by,
        metadata: {},
      });

    const assignmentInfo = ticketData.assigned_to
      ? ` (assigned)`
      : " (unassigned)";
    console.log(
      `✅ Created ticket: ${ticketData.ticket_number} - ${ticketData.status}${assignmentInfo}`,
    );
  }

  // 5. Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ Database seeding complete!");
  console.log("=".repeat(60));
  console.log("\n📊 Summary:");
  console.log(`   • Organization: 1`);
  console.log(`   • Users: ${usersToCreate.length}`);
  console.log(`     - Admins: 2`);
  console.log(`     - Agents: 5 (1 inactive)`);
  console.log(`     - Customers: 4`);
  console.log(`   • Buckets: ${bucketsToCreate.length}`);
  console.log(`   • Tickets: ${ticketsToCreate.length}`);
  console.log(`     - Open: 5 (3 assigned, 2 unassigned)`);
  console.log(`     - Pending: 2 (both assigned)`);
  console.log(`     - Resolved: 2 (both assigned)`);
  console.log(`     - Closed: 1 (assigned)`);
  console.log(`     - With buckets: 9, Without bucket: 1`);

  console.log("\n🔑 Login Credentials:");
  console.log("─".repeat(60));
  console.log("Admins:");
  console.log("  • admin@example.com / admin123");
  console.log("  • admin2@example.com / admin123");
  console.log("\nAgents:");
  console.log("  • manager@example.com / manager123 (multi-skill)");
  console.log("  • agent@example.com / agent123");
  console.log("  • agent2@example.com / agent123 (billing)");
  console.log("  • agent3@example.com / agent123 (sales)");
  console.log("  • agent4@example.com / agent123 (support)");
  console.log("\nCustomers:");
  console.log("  • customer@example.com / customer123");
  console.log("  • customer2@example.com / customer123");
  console.log("  • customer3@example.com / customer123");
  console.log("  • customer4@example.com / customer123");
  console.log("─".repeat(60));

  console.log("\n🎯 Test Scenarios:");
  console.log("  ✓ Skill-based ticket assignment");
  console.log("  ✓ Unassigned tickets");
  console.log("  ✓ Tickets with no required skill");
  console.log("  ✓ Different ticket statuses");
  console.log("  ✓ Different priorities");
  console.log("  ✓ Different sources (email, web, api)");
  console.log("  ✓ Inactive agent (should not appear in assignments)");
  console.log("  ✓ Multiple agents with same skills");
  console.log("  ✓ Manager with multiple skills");
  console.log("  ✓ Bucket categorization");
  console.log("  ✓ Tickets with and without buckets");

  process.exit(0);
}

seedFull().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});




