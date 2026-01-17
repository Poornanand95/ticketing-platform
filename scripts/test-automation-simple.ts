import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), ".env") });

import { getDb } from "@ticketing/db";
import { getConfig } from "@ticketing/config";
import { organizations, users, userRoles, roles, tickets, automationRules } from "@ticketing/db";
import { eq, and, isNull } from "drizzle-orm";
import axios from "axios";

const config = getConfig();
const db = getDb(config.DATABASE_URL);

const ticketServiceUrl = process.env.TICKET_SERVICE_URL || "http://localhost:3002";
const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3001";

async function testAutomationSimple() {
  console.log("🧪 Testing Skill-Based Auto-Assignment - Simple Scenario\n");
  console.log("=".repeat(70));

  try {
    // 1. Get organization
    console.log("\n📦 Step 1: Getting organization...");
    const [org] = await db
      .select()
      .from(organizations)
      .where(isNull(organizations.deleted_at))
      .limit(1);

    if (!org) {
      console.error("❌ No organization found. Please run seed script first.");
      process.exit(1);
    }
    console.log(`✅ Organization: ${org.name} (${org.id})`);

    // 2. Check automation rule exists and is enabled
    console.log("\n🤖 Step 2: Checking automation rules...");
    const rules = await db
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.org_id, org.id),
          eq(automationRules.enabled, true),
        ),
      );

    const skillRule = rules.find((r) => {
      const actions = r.actions as Array<{ type: string; params: Record<string, unknown> }>;
      return actions.some((a) => a.type === "assign_agent" && a.params?.strategy === "skill_match");
    });

    if (!skillRule) {
      console.error("❌ No skill-based auto-assignment rule found!");
      console.error("\n   Creating one now...");
      
      // Create the rule
      const { nanoid } = await import("nanoid");
      const [newRule] = await db
        .insert(automationRules)
        .values({
          id: nanoid(),
          org_id: org.id,
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
        })
        .returning();
      
      console.log(`✅ Created automation rule: ${newRule.name}`);
    } else {
      console.log(`✅ Found automation rule: ${skillRule.name}`);
      console.log(`   Priority: ${skillRule.priority}`);
      console.log(`   Enabled: ${skillRule.enabled}`);
    }

    // 3. Get an agent with skills
    console.log("\n👤 Step 3: Finding agent with skills...");
    const [agentRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "agent"))
      .limit(1);

    if (!agentRole) {
      console.error("❌ Agent role not found!");
      process.exit(1);
    }

    const agents = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        skills: users.skills,
        is_active: users.is_active,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.user_id))
      .where(
        and(
          eq(users.org_id, org.id),
          eq(userRoles.role_id, agentRole.id),
          isNull(users.deleted_at),
          eq(users.is_active, true),
        ),
      )
      .limit(10);

    const agentsWithSkills = agents.filter(
      (a) => a.skills && Array.isArray(a.skills) && a.skills.length > 0
    );

    if (agentsWithSkills.length === 0) {
      console.error("❌ No agents with skills found!");
      console.error("\n   Please assign skills to agents or run seed script.");
      process.exit(1);
    }

    const testAgent = agentsWithSkills[0];
    const testSkill = (testAgent.skills as string[])[0];
    
    console.log(`✅ Found agent: ${testAgent.name} (${testAgent.email})`);
    console.log(`   Skills: ${(testAgent.skills as string[]).join(", ")}`);
    console.log(`   Using skill for test: ${testSkill}`);

    // 4. Get a customer
    console.log("\n👥 Step 4: Getting customer...");
    const [customerRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "customer"))
      .limit(1);

    const [customer] = await db
      .select()
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.user_id))
      .where(
        and(
          eq(users.org_id, org.id),
          eq(userRoles.role_id, customerRole.id),
          isNull(users.deleted_at),
        ),
      )
      .limit(1);

    if (!customer) {
      console.error("❌ No customer found!");
      process.exit(1);
    }
    console.log(`✅ Customer: ${customer.users.name} (${customer.users.email})`);

    // 5. Get auth token
    console.log("\n🔐 Step 5: Authenticating...");
    let authToken: string;
    try {
      const loginResponse = await axios.post(`${authServiceUrl}/auth/login`, {
        email: customer.users.email,
        password: "customer123",
      });
      authToken = loginResponse.data.accessToken;
      console.log("✅ Authentication successful");
    } catch (error: any) {
      console.error("❌ Failed to authenticate:", error.response?.data || error.message);
      console.error("   Trying admin user...");
      try {
        const adminLogin = await axios.post(`${authServiceUrl}/auth/login`, {
          email: "admin@example.com",
          password: "admin123",
        });
        authToken = adminLogin.data.accessToken;
        console.log("✅ Authentication successful with admin");
      } catch (err: any) {
        console.error("❌ Failed to authenticate:", err.response?.data || err.message);
        process.exit(1);
      }
    }

    // 6. Create test ticket
    console.log("\n🎫 Step 6: Creating test ticket...");
    const ticketSubject = `[AUTOMATION TEST] Skill-based assignment test - ${new Date().toISOString()}`;
    
    const ticketData = {
      subject: ticketSubject,
      priority: "medium",
      source: "web",
      required_skill: testSkill,
    };

    console.log(`   Subject: ${ticketSubject}`);
    console.log(`   Required Skill: ${testSkill}`);
    console.log(`   Expected Agent: ${testAgent.name}`);

    let ticket;
    try {
      const createResponse = await axios.post(
        `${ticketServiceUrl}/tickets`,
        ticketData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );
      ticket = createResponse.data;
      console.log(`✅ Ticket created: ${ticket.ticket_number}`);
      console.log(`   Ticket ID: ${ticket.id}`);
      console.log(`   Initial Assigned To: ${ticket.assigned_to || "Not assigned"}`);
    } catch (error: any) {
      console.error("❌ Failed to create ticket:", error.response?.data || error.message);
      process.exit(1);
    }

    // 7. Wait for automation
    console.log("\n⏳ Step 7: Waiting for automation to process...");
    console.log("   Waiting 10 seconds for Kafka event processing...");
    
    for (let i = 10; i > 0; i--) {
      process.stdout.write(`\r   ${i} seconds remaining...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("\n");

    // 8. Check result
    console.log("\n🔍 Step 8: Checking if ticket was assigned...");
    try {
      const ticketResponse = await axios.get(`${ticketServiceUrl}/tickets/${ticket.id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const updatedTicket = ticketResponse.data;

      console.log(`   Current Assigned To: ${updatedTicket.assigned_to || "Not assigned"}`);

      if (updatedTicket.assigned_to) {
        if (updatedTicket.assigned_to === testAgent.id) {
          console.log(`\n✅ SUCCESS! Automation worked!`);
          console.log(`   Ticket was automatically assigned to: ${testAgent.name}`);
          console.log(`   Agent has matching skill: ${testSkill}`);
        } else {
          const assignedAgent = agents.find((a) => a.id === updatedTicket.assigned_to);
          if (assignedAgent) {
            console.log(`\n⚠️  Ticket was assigned, but to different agent:`);
            console.log(`   Assigned to: ${assignedAgent.name}`);
            console.log(`   Expected: ${testAgent.name}`);
            console.log(`   This might be correct if the assigned agent also has the skill.`);
          } else {
            console.log(`\n⚠️  Ticket was assigned to unknown agent ID: ${updatedTicket.assigned_to}`);
          }
        }
      } else {
        console.log(`\n❌ FAILED! Ticket was not automatically assigned.`);
        console.log(`\n   Troubleshooting steps:`);
        console.log(`   1. Check if automation-service is running:`);
        console.log(`      → Check logs: tail -f logs/automation-service.log`);
        console.log(`   2. Check if Kafka is running:`);
        console.log(`      → docker ps | grep kafka`);
        console.log(`   3. Check if ticket event was published:`);
        console.log(`      → Check ticket-service logs: tail -f logs/ticket-service.log`);
        console.log(`   4. Verify automation rule is enabled in database`);
        console.log(`   5. Check automation-service logs for errors`);
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch ticket:", error.response?.data || error.message);
    }

    // 9. Check services
    console.log("\n🏥 Step 9: Checking service health...");
    
    const services = [
      { name: "Automation Service", url: "http://localhost:3004/health" },
      { name: "Ticket Service", url: "http://localhost:3002/health" },
      { name: "Auth Service", url: "http://localhost:3001/health" },
    ];

    for (const service of services) {
      try {
        const response = await axios.get(service.url, { timeout: 2000 });
        console.log(`   ✅ ${service.name}: Running`);
      } catch (error: any) {
        console.log(`   ❌ ${service.name}: Not responding`);
        console.log(`      Error: ${error.message}`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ Test completed!");
    console.log("=".repeat(70));
    console.log("\n📋 Summary:");
    console.log(`   • Ticket Number: ${ticket.ticket_number}`);
    console.log(`   • Ticket ID: ${ticket.id}`);
    console.log(`   • Required Skill: ${testSkill}`);
    console.log(`   • Expected Agent: ${testAgent.name}`);
    console.log(`   • Final Status: ${updatedTicket?.assigned_to ? "✅ Assigned" : "❌ Not Assigned"}`);
    console.log("\n💡 Next Steps:");
    console.log(`   1. Check automation-service logs: tail -f logs/automation-service.log`);
    console.log(`   2. Check ticket-service logs: tail -f logs/ticket-service.log`);
    console.log(`   3. Verify Kafka is running: docker ps | grep kafka`);
    console.log(`   4. If still not working, check the logs for errors`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testAutomationSimple();

