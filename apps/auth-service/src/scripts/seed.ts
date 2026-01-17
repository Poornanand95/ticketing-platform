import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { getDb } from "@ticketing/db";
import { getConfig } from "@ticketing/config";
import { roles } from "@ticketing/db";
import { nanoid } from "nanoid";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

const config = getConfig();
const db = getDb(config.DATABASE_URL);

async function seed() {
  console.log("Seeding default roles...");

  const defaultRoles = [
    { name: "admin", permissions: ["*"] },
    { name: "agent", permissions: ["ticket:read", "ticket:write", "ticket:assign"] },
    { name: "customer", permissions: ["ticket:read", "ticket:write"] },
  ];

  for (const role of defaultRoles) {
    await db
      .insert(roles)
      .values({
        id: nanoid(),
        name: role.name,
        permissions: role.permissions,
      })
      .onConflictDoNothing();

    console.log(`Seeded role: ${role.name}`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});

