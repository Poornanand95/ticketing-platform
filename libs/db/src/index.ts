import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb(connectionString: string) {
  if (!pool) {
    pool = new pg.Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
    });
  }

  if (!dbInstance) {
    dbInstance = drizzle(pool, { schema });
  }

  return dbInstance;
}

export function closeDb() {
  if (pool) {
    return pool.end();
  }
}

export * from "./schema";

