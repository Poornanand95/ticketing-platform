import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { getDb } from "@ticketing/db";
import { getConfig } from "@ticketing/config";
import { organizations, users, roles, userRoles } from "@ticketing/db";
import { eq, isNull } from "drizzle-orm";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

const config = getConfig();
const db = getDb(config.DATABASE_URL);

async function checkDatabase() {
  console.log("🔍 Checking Database and Infrastructure...\n");

  try {
    // 1. Test database connection
    console.log("1️⃣ Testing database connection...");
    await db.select().from(organizations).limit(1);
    console.log("   ✅ Database connection successful\n");

    // 2. Check organizations
    console.log("2️⃣ Checking organizations...");
    const orgs = await db.select().from(organizations).where(isNull(organizations.deleted_at));
    console.log(`   Found ${orgs.length} organization(s)`);
    if (orgs.length > 0) {
      orgs.forEach((org) => {
        console.log(`   - ${org.name} (${org.id})`);
      });
    } else {
      console.log("   ⚠️  No organizations found. Run 'pnpm setup' to create one.");
    }
    console.log();

    // 3. Check roles
    console.log("3️⃣ Checking roles...");
    const allRoles = await db.select().from(roles);
    console.log(`   Found ${allRoles.length} role(s)`);
    const requiredRoles = ["admin", "agent", "customer"];
    const foundRoles = allRoles.map((r) => r.name);
    
    requiredRoles.forEach((roleName) => {
      if (foundRoles.includes(roleName)) {
        console.log(`   ✅ ${roleName} role exists`);
      } else {
        console.log(`   ❌ ${roleName} role MISSING - Run 'pnpm seed' to create roles`);
      }
    });
    console.log();

    // 4. Check users
    console.log("4️⃣ Checking users...");
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        org_id: users.org_id,
        deleted_at: users.deleted_at,
      })
      .from(users)
      .where(isNull(users.deleted_at));

    console.log(`   Found ${allUsers.length} active user(s)`);
    
    if (allUsers.length === 0) {
      console.log("   ⚠️  No users found. Run 'pnpm setup' to create default users.");
    } else {
      for (const user of allUsers) {
        const userRolesList = await db
          .select({ name: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.role_id, roles.id))
          .where(eq(userRoles.user_id, user.id));

        const roleNames = userRolesList.map((ur) => ur.name);
        console.log(`   - ${user.email} (${user.name}) - Roles: [${roleNames.join(", ")}]`);
      }
    }
    console.log();

    // 5. Check default credentials
    console.log("5️⃣ Default login credentials:");
    console.log("   Admin: admin@example.com / admin123");
    console.log("   Agent: agent@example.com / agent123");
    console.log("   Customer: customer@example.com / customer123");
    console.log();

    // 6. Check environment variables
    console.log("6️⃣ Environment variables:");
    console.log(`   DATABASE_URL: ${config.DATABASE_URL ? "✅ Set" : "❌ Missing"}`);
    console.log(`   JWT_SECRET: ${config.JWT_SECRET ? "✅ Set" : "❌ Missing"}`);
    console.log(`   JWT_REFRESH_SECRET: ${config.JWT_REFRESH_SECRET ? "✅ Set" : "❌ Missing"}`);
    console.log();

    // 7. Summary
    console.log("📊 Summary:");
    const hasOrgs = orgs.length > 0;
    const hasAllRoles = requiredRoles.every((r) => foundRoles.includes(r));
    const hasUsers = allUsers.length > 0;
    const hasConfig = config.DATABASE_URL && config.JWT_SECRET && config.JWT_REFRESH_SECRET;

    if (hasOrgs && hasAllRoles && hasUsers && hasConfig) {
      console.log("   ✅ All checks passed! Database is ready.");
      console.log("   You should be able to login with the default credentials.");
    } else {
      console.log("   ⚠️  Some checks failed. Please fix the issues above.");
      if (!hasOrgs || !hasUsers) {
        console.log("   → Run: cd apps/auth-service && pnpm setup");
      }
      if (!hasAllRoles) {
        console.log("   → Run: cd apps/auth-service && pnpm seed");
      }
      if (!hasConfig) {
        console.log("   → Check your .env file in ticketing-platform/");
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Database check failed:");
    console.error(error);
    console.error("\nPossible issues:");
    console.error("1. PostgreSQL is not running");
    console.error("2. DATABASE_URL is incorrect");
    console.error("3. Database doesn't exist");
    console.error("\nTo fix:");
    console.error("1. Start Docker: docker-compose -f infra/compose/docker-compose.yml up -d");
    console.error("2. Wait 30 seconds for PostgreSQL to be ready");
    console.error("3. Run database migrations: cd libs/db && pnpm db:push");
    process.exit(1);
  }
}

checkDatabase();








