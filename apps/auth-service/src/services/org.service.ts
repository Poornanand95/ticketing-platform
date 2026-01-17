import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Logger } from "@ticketing/logger";
import { organizations } from "@ticketing/db";
import { nanoid } from "nanoid";

export class OrgService {
  constructor(
    private db: NodePgDatabase<typeof schema>,
    private logger: Logger,
  ) {}

  async createOrg(data: { name: string; tier?: "free" | "pro" | "enterprise" }) {
    const [org] = await this.db
      .insert(organizations)
      .values({
        id: nanoid(),
        name: data.name,
        tier: data.tier || "free",
      })
      .returning();

    return {
      id: org.id,
      name: org.name,
      tier: org.tier,
      created_at: org.created_at,
    };
  }

  async getOrgById(orgId: string) {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org || org.deleted_at) {
      return null;
    }

    return {
      id: org.id,
      name: org.name,
      tier: org.tier,
      created_at: org.created_at,
      updated_at: org.updated_at,
    };
  }
}

