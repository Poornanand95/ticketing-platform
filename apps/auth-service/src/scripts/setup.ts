import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { getDb } from "@ticketing/db";
import { getConfig } from "@ticketing/config";
import { organizations, users, roles, userRoles } from "@ticketing/db";
import { nanoid } from "nanoid";
import { hashPassword } from "@ticketing/auth";
import { eq } from "drizzle-orm";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

const config = getConfig();
const db = getDb(config.DATABASE_URL);

async function setup() {
  console.log("🚀 Setting up initial data...\n");

  // 1. Create or get default organization
  console.log("📦 Setting up default organization...");
  
  // Check if organization already exists
  const [existingOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, "Default Organization"))
    .limit(1);

  let orgId: string;
  if (existingOrg && !existingOrg.deleted_at) {
    orgId = existingOrg.id;
    console.log(`ℹ️  Organization already exists: ${existingOrg.name} (${orgId})`);
  } else {
    const [org] = await db
      .insert(organizations)
      .values({
        id: nanoid(),
        name: "Default Organization",
        tier: "free",
      })
      .returning();
    
    orgId = org.id;
    console.log(`✅ Created organization: ${org.name} (${orgId})`);
  }

  // 2. Get roles
  console.log("\n👥 Fetching roles...");
  const [adminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "admin"))
    .limit(1);
  
  const [agentRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "agent"))
    .limit(1);
  
  const [customerRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "customer"))
    .limit(1);

  if (!adminRole || !agentRole || !customerRole) {
    throw new Error("Roles not found. Please run 'pnpm seed' first.");
  }

  console.log("✅ Roles found");

  // 3. Create admin user
  console.log("\n👤 Creating admin user...");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminName = process.env.ADMIN_NAME || "Admin User";

  const adminPasswordHash = await hashPassword(adminPassword);

  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existingAdmin && !existingAdmin.deleted_at) {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  } else {
    const [adminUser] = await db
      .insert(users)
      .values({
        id: nanoid(),
        org_id: orgId,
        email: adminEmail,
        name: adminName,
        password_hash: adminPasswordHash,
      })
      .returning();

    await db.insert(userRoles).values({
      user_id: adminUser.id,
      role_id: adminRole.id,
    });

    console.log(`✅ Created admin user: ${adminEmail} / ${adminPassword}`);
  }

  // 4. Create agent user
  console.log("\n👤 Creating agent user...");
  const agentEmail = process.env.AGENT_EMAIL || "agent@example.com";
  const agentPassword = process.env.AGENT_PASSWORD || "agent123";
  const agentName = process.env.AGENT_NAME || "Agent User";

  const agentPasswordHash = await hashPassword(agentPassword);

  const [existingAgent] = await db
    .select()
    .from(users)
    .where(eq(users.email, agentEmail))
    .limit(1);

  if (existingAgent && !existingAgent.deleted_at) {
    console.log(`ℹ️  Agent user already exists: ${agentEmail}`);
  } else {
    const [agentUser] = await db
      .insert(users)
      .values({
        id: nanoid(),
        org_id: orgId,
        email: agentEmail,
        name: agentName,
        password_hash: agentPasswordHash,
      })
      .returning();

    await db.insert(userRoles).values({
      user_id: agentUser.id,
      role_id: agentRole.id,
    });

    console.log(`✅ Created agent user: ${agentEmail} / ${agentPassword}`);
  }

  // 5. Create customer user
  console.log("\n👤 Creating customer user...");
  const customerEmail = process.env.CUSTOMER_EMAIL || "customer@example.com";
  const customerPassword = process.env.CUSTOMER_PASSWORD || "customer123";
  const customerName = process.env.CUSTOMER_NAME || "Customer User";

  const customerPasswordHash = await hashPassword(customerPassword);

  const [existingCustomer] = await db
    .select()
    .from(users)
    .where(eq(users.email, customerEmail))
    .limit(1);

  if (existingCustomer && !existingCustomer.deleted_at) {
    console.log(`ℹ️  Customer user already exists: ${customerEmail}`);
  } else {
    const [customerUser] = await db
      .insert(users)
      .values({
        id: nanoid(),
        org_id: orgId,
        email: customerEmail,
        name: customerName,
        password_hash: customerPasswordHash,
      })
      .returning();

    await db.insert(userRoles).values({
      user_id: customerUser.id,
      role_id: customerRole.id,
    });

    console.log(`✅ Created customer user: ${customerEmail} / ${customerPassword}`);
  }

  console.log("\n✅ Setup complete!\n");
  console.log("📋 Default Credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Admin:    ${adminEmail} / ${adminPassword}`);
  console.log(`Agent:    ${agentEmail} / ${agentPassword}`);
  console.log(`Customer: ${customerEmail} / ${customerPassword}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("⚠️  Change these passwords in production!\n");

  process.exit(0);
}

setup().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});

