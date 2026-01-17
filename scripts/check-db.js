#!/usr/bin/env node

import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
loadEnv({ path: resolve(__dirname, "../.env") });

// Simple database connection test using pg directly
import pg from "pg";
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ticketing";

async function checkDatabase() {
  console.log("🔍 Checking Database and Infrastructure...\n");
  console.log(`Database URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  try {
    // 1. Test database connection
    console.log("1️⃣ Testing database connection...");
    const client = await pool.connect();
    console.log("   ✅ Database connection successful\n");
    
    // 2. Check organizations
    console.log("2️⃣ Checking organizations...");
    const orgResult = await client.query(
      "SELECT id, name, tier, created_at FROM organizations WHERE deleted_at IS NULL"
    );
    console.log(`   Found ${orgResult.rows.length} organization(s)`);
    if (orgResult.rows.length > 0) {
      orgResult.rows.forEach((org) => {
        console.log(`   - ${org.name} (${org.id})`);
      });
    } else {
      console.log("   ⚠️  No organizations found. Run 'pnpm setup' to create one.");
    }
    console.log();

    // 3. Check roles
    console.log("3️⃣ Checking roles...");
    const rolesResult = await client.query("SELECT name FROM roles");
    const foundRoles = rolesResult.rows.map((r) => r.name);
    console.log(`   Found ${foundRoles.length} role(s)`);
    const requiredRoles = ["admin", "agent", "customer"];
    
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
    const usersResult = await client.query(`
      SELECT u.id, u.email, u.name, u.org_id
      FROM users u
      WHERE u.deleted_at IS NULL
    `);
    
    console.log(`   Found ${usersResult.rows.length} active user(s)`);
    
    if (usersResult.rows.length === 0) {
      console.log("   ⚠️  No users found. Run 'pnpm setup' to create default users.");
    } else {
      for (const user of usersResult.rows) {
        const rolesResult = await client.query(`
          SELECT r.name
          FROM user_roles ur
          INNER JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = $1
        `, [user.id]);
        
        const roleNames = rolesResult.rows.map((r) => r.name);
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
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "✅ Set" : "❌ Missing"}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? "✅ Set" : "❌ Missing"}`);
    console.log(`   JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? "✅ Set" : "❌ Missing"}`);
    console.log();

    // 7. Summary
    console.log("📊 Summary:");
    const hasOrgs = orgResult.rows.length > 0;
    const hasAllRoles = requiredRoles.every((r) => foundRoles.includes(r));
    const hasUsers = usersResult.rows.length > 0;
    const hasConfig = process.env.DATABASE_URL && process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET;

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

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Database check failed:");
    console.error(error.message);
    console.error("\nPossible issues:");
    console.error("1. PostgreSQL is not running");
    console.error("2. DATABASE_URL is incorrect");
    console.error("3. Database doesn't exist");
    console.error("4. Connection timeout (database not ready)");
    console.error("\nTo fix:");
    console.error("1. Start Docker: cd ticketing-platform/infra/compose && docker-compose up -d");
    console.error("2. Wait 30 seconds for PostgreSQL to be ready");
    console.error("3. Run database migrations: cd libs/db && pnpm db:push");
    console.error("4. Seed roles: cd apps/auth-service && pnpm seed");
    console.error("5. Setup users: cd apps/auth-service && pnpm setup");
    
    await pool.end();
    process.exit(1);
  }
}

checkDatabase();




