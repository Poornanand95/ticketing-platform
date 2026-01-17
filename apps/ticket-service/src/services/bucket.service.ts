import { eq, and, desc, isNull, sql, count } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Logger } from "@ticketing/logger";
import { buckets, tickets } from "@ticketing/db";
import { nanoid } from "nanoid";

export class BucketService {
  constructor(
    private db: NodePgDatabase<typeof schema>,
    private logger: Logger,
  ) {}

  async createBucket(data: {
    org_id: string;
    name: string;
    tag?: string | null;
    description?: string | null;
    color?: string | null;
    custom_fields?: Array<{
      key: string;
      label: string;
      type: "text" | "number" | "date" | "select" | "textarea" | "boolean";
      required?: boolean;
      options?: string[];
      placeholder?: string;
    }>;
  }) {
    const bucketResult = await this.db
      .insert(buckets)
      .values({
        id: nanoid(),
        org_id: data.org_id,
        name: data.name,
        tag: data.tag || null,
        description: data.description || null,
        color: data.color || null,
        custom_fields: data.custom_fields || [],
      })
      .returning();

    const bucket = Array.isArray(bucketResult) ? bucketResult[0] : null;
    if (!bucket) {
      throw new Error("Failed to create bucket");
    }

    return bucket;
  }

  async getBuckets(orgId: string, includeTicketCount = false) {
    const results = await this.db
      .select()
      .from(buckets)
      .where(eq(buckets.org_id, orgId))
      .orderBy(desc(buckets.created_at));

    const activeBuckets = results.filter((b) => !b.deleted_at);

    if (includeTicketCount) {
      const bucketsWithCount = await Promise.all(
        activeBuckets.map(async (bucket) => {
          const ticketCount = await this.getTicketCountForBucket(bucket.id, orgId);
          return {
            ...bucket,
            ticket_count: ticketCount,
          };
        }),
      );
      return bucketsWithCount;
    }

    return activeBuckets;
  }

  async getBucketById(bucketId: string, orgId: string) {
    const [bucket] = await this.db
      .select()
      .from(buckets)
      .where(and(eq(buckets.id, bucketId), eq(buckets.org_id, orgId)))
      .limit(1);

    if (!bucket || bucket.deleted_at) {
      return null;
    }

    return bucket;
  }

  async getTicketCountForBucket(bucketId: string, orgId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.bucket_id, bucketId),
          eq(tickets.org_id, orgId),
          isNull(tickets.deleted_at),
        ),
      );

    return result[0]?.count || 0;
  }

  async updateBucket(
    bucketId: string,
    orgId: string,
    updates: {
      name?: string;
      tag?: string | null;
      description?: string | null;
      color?: string | null;
      custom_fields?: Array<{
        key: string;
        label: string;
        type: "text" | "number" | "date" | "select" | "textarea" | "boolean";
        required?: boolean;
        options?: string[];
        placeholder?: string;
      }>;
    },
  ) {
    const [existing] = await this.db
      .select()
      .from(buckets)
      .where(and(eq(buckets.id, bucketId), eq(buckets.org_id, orgId)))
      .limit(1);

    if (!existing || existing.deleted_at) {
      throw new Error("Bucket not found");
    }

    // Check if bucket has tickets assigned
    const ticketCount = await this.getTicketCountForBucket(bucketId, orgId);

    // If trying to change name and bucket has tickets, restrict it
    if (updates.name !== undefined && updates.name !== existing.name && ticketCount > 0) {
      throw new Error(
        `Cannot change bucket name. This bucket has ${ticketCount} ticket${ticketCount !== 1 ? "s" : ""} assigned. Remove all tickets from this bucket before renaming it.`,
      );
    }

    // Allow updates to tag, description, and color even if tickets are assigned
    const [updated] = await this.db
      .update(buckets)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(eq(buckets.id, bucketId))
      .returning();

    return updated;
  }

  async deleteBucket(bucketId: string, orgId: string) {
    const [existing] = await this.db
      .select()
      .from(buckets)
      .where(and(eq(buckets.id, bucketId), eq(buckets.org_id, orgId)))
      .limit(1);

    if (!existing || existing.deleted_at) {
      throw new Error("Bucket not found");
    }

    // Check if bucket has tickets assigned
    const ticketCount = await this.getTicketCountForBucket(bucketId, orgId);

    if (ticketCount > 0) {
      throw new Error(
        `Cannot delete bucket. This bucket has ${ticketCount} ticket${ticketCount !== 1 ? "s" : ""} assigned. Remove all tickets from this bucket before deleting it.`,
      );
    }

    const [deleted] = await this.db
      .update(buckets)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(buckets.id, bucketId))
      .returning();

    return deleted;
  }
}

