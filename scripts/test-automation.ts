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

async function testAutomation() {
  console.log("🧪 Testing Skill-Based Auto-Assignment Automation\n");
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
    console.log(`✅ Found organization: ${org.name} (${org.id})`);

    // 2. Check automation rules
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

    const skillRule = rules.find((r) => 
      r.name.includes("Skill") && 
      r.actions.some((a: any) => a.type === "assign_agent" && a.params?.strategy === "skill_match")
    );

    if (!skillRule) {
      console.error("❌ No skill-based auto-assignment rule found!");
      console.error("   Please ensure the automation rule exists and is enabled.");
      process.exit(1);
    }
    console.log(`✅ Found skill-based rule: ${skillRule.name}`);
    console.log(`   Priority: ${skillRule.priority}`);
    console.log(`   Conditions: ${JSON.stringify(skillRule.conditions)}`);
    console.log(`   Actions: ${JSON.stringify(skillRule.actions)}`);

    // 3. Get agents with skills
    console.log("\n👤 Step 3: Checking agents with skills...");
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
      );

    if (agents.length === 0) {
      console.error("❌ No active agents found!");
      process.exit(1);
    }

    const agentsWithSkills = agents.filter((a) => a.skills && Array.isArray(a.skills) && a.skills.length > 0);
    console.log(`✅ Found ${agents.length} active agents`);
    console.log(`   ${agentsWithSkills.length} agents have skills assigned`);

    if (agentsWithSkills.length === 0) {
      console.error("❌ No agents with skills found! Automation cannot work without agents having skills.");
      console.error("   Please assign skills to agents or run the seed script.");
      process.exit(1);
    }

    // Display agents and their skills
    console.log("\n   Agents with skills:");
    agentsWithSkills.forEach((agent) => {
      console.log(`   • ${agent.name} (${agent.email})`);
      console.log(`     Skills: ${(agent.skills as string[]).join(", ")}`);
    });

    // 4. Get a customer to create ticket
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
    console.log(`✅ Found customer: ${customer.users.name} (${customer.users.email})`);

    // 5. Get authentication token
    console.log("\n🔐 Step 5: Getting authentication token...");
    let authToken: string;
    try {
      const loginResponse = await axios.post(`${authServiceUrl}/auth/login`, {
        email: customer.users.email,
        password: "customer123", // Default password from seed
      });
      authToken = loginResponse.data.access_token;
      console.log("✅ Authentication successful");
    } catch (error: any) {
      console.error("❌ Failed to authenticate:", error.response?.data || error.message);
      console.error("   Trying to get token for admin user...");
      try {
        const adminLogin = await axios.post(`${authServiceUrl}/auth/login`, {
          email: "admin@example.com",
          password: "admin123",
        });
        authToken = adminLogin.data.access_token;
        console.log("✅ Authentication successful with admin");
      } catch (err: any) {
        console.error("❌ Failed to authenticate:", err.response?.data || err.message);
        process.exit(1);
      }
    }

    // 6. Create a test ticket with required_skill
    console.log("\n🎫 Step 6: Creating test ticket with required_skill...");
    const testSkill = (agentsWithSkills[0].skills as string[])[0];
    console.log(`   Using skill: ${testSkill}`);
    console.log(`   Expected agent: ${agentsWithSkills[0].name}`);

    const ticketData = {
      subject: `[AUTOMATION TEST] Test ticket for skill-based assignment - ${new Date().toISOString()}`,
      priority: "medium",
      source: "web",
      required_skill: testSkill,
    };

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
      console.log(`   Required Skill: ${ticket.required_skill}`);
      console.log(`   Assigned To: ${ticket.assigned_to || "Not assigned yet"}`);
    } catch (error: any) {
      console.error("❌ Failed to create ticket:", error.response?.data || error.message);
      process.exit(1);
    }

    // 7. Wait a bit for automation to process
    console.log("\n⏳ Step 7: Waiting for automation to process (5 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 8. Check if ticket was assigned
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
        const assignedAgent = agentsWithSkills.find((a) => a.id === updatedTicket.assigned_to);
        if (assignedAgent) {
          console.log(`\n✅ SUCCESS! Ticket was automatically assigned!`);
          console.log(`   Assigned to: ${assignedAgent.name} (${assignedAgent.email})`);
          console.log(`   Agent has skill: ${testSkill}`);
        } else {
          console.log(`\n⚠️  Ticket was assigned, but to an unexpected agent`);
          console.log(`   Assigned to ID: ${updatedTicket.assigned_to}`);
        }
      } else {
        console.log(`\n❌ FAILED! Ticket was not automatically assigned.`);
        console.log(`\n   Possible issues:`);
        console.log(`   1. Automation service is not running`);
        console.log(`   2. Kafka is not running or not connected`);
        console.log(`   3. Automation service failed to process the event`);
        console.log(`   4. Check automation-service logs for errors`);
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch ticket:", error.response?.data || error.message);
    }

    // 9. Check automation service health
    console.log("\n🏥 Step 9: Checking automation service health...");
    try {
      const healthResponse = await axios.get("http://localhost:3004/health");
      console.log(`✅ Automation service is running: ${JSON.stringify(healthResponse.data)}`);
    } catch (error: any) {
      console.error("❌ Automation service is not responding!");
      console.error("   Make sure automation-service is running on port 3004");
      console.error("   Error:", error.message);
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ Test completed!");
    console.log("=".repeat(70));

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testAutomation();

