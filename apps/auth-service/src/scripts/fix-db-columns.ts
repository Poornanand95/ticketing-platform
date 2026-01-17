import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { getDb } from "@ticketing/db";
import { getConfig } from "@ticketing/config";
import { sql } from "drizzle-orm";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

const config = getConfig();
const db = getDb(config.DATABASE_URL);

async function fixDatabaseColumns() {
  console.log("🔧 Fixing Database Columns...\n");

  try {
    // Check if skills column exists
    const skillsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'skills'
    `);

    if (skillsCheck.rows.length === 0) {
      console.log("Adding skills column to users table...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN skills JSONB DEFAULT '[]'::jsonb`);
      console.log("✅ Added skills column");
    } else {
      console.log("✅ skills column already exists");
    }

    // Check if is_active column exists
    const isActiveCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_active'
    `);

    if (isActiveCheck.rows.length === 0) {
      console.log("Adding is_active column to users table...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL`);
      console.log("✅ Added is_active column");
    } else {
      console.log("✅ is_active column already exists");
    }

    // Check if required_skill column exists
    const requiredSkillCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets' AND column_name = 'required_skill'
    `);

    if (requiredSkillCheck.rows.length === 0) {
      console.log("Adding required_skill column to tickets table...");
      await db.execute(sql`ALTER TABLE tickets ADD COLUMN required_skill TEXT`);
      console.log("✅ Added required_skill column");
    } else {
      console.log("✅ required_skill column already exists");
    }

    // Update existing records
    console.log("\nUpdating existing records...");
    await db.execute(sql`UPDATE users SET skills = '[]'::jsonb WHERE skills IS NULL`);
    await db.execute(sql`UPDATE users SET is_active = true WHERE is_active IS NULL`);
    console.log("✅ Updated existing records\n");

    console.log("✅ Database fix complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Database fix failed:");
    console.error(error);
    process.exit(1);
  }
}

fixDatabaseColumns();








