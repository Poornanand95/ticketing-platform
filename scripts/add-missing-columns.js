#!/usr/bin/env node

import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import pg from "pg";
const { Pool } = pg;

// Load environment variables
loadEnv({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ticketing";

async function addMissingColumns() {
  console.log("🔧 Adding missing columns to database...\n");
  console.log(`Database URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    console.log("✅ Connected to database\n");

    // Read and execute the SQL file
    const sqlFile = resolve(process.cwd(), "scripts/add-missing-columns.sql");
    const sql = readFileSync(sqlFile, "utf-8");

    console.log("📝 Executing SQL script...\n");
    await client.query(sql);

    console.log("✅ Successfully added missing columns!\n");
    console.log("Added columns:");
    console.log("  • custom_fields to tickets table (JSONB, default: {})");
    console.log("  • custom_fields to buckets table (JSONB, default: [])");

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Failed to add missing columns:");
    console.error(error.message);
    
    await pool.end();
    process.exit(1);
  }
}

addMissingColumns();

