import { createClient } from "redis";
import type { Logger } from "@ticketing/logger";

export class TicketNumberService {
  private redis: ReturnType<typeof createClient> | null = null;

  constructor(
    private redisUrl: string,
    private logger: Logger,
  ) {}

  private async getRedis() {
    if (!this.redis) {
      this.redis = createClient({ url: this.redisUrl });
      await this.redis.connect();
    }
    return this.redis;
  }

  async generateTicketNumber(orgId: string): Promise<string> {
    const year = new Date().getFullYear();
    const key = `org:${orgId}:ticket_seq:${year}`;

    try {
      const redis = await this.getRedis();
      const sequence = await redis.incr(key);

      return `TCK-${year}-${String(sequence).padStart(4, "0")}`;
    } catch (error) {
      this.logger.warn({ error }, "Redis unavailable, using fallback");
      return this.generateFallbackTicketNumber(orgId, year);
    }
  }

  private async generateFallbackTicketNumber(
    orgId: string,
    year: number,
  ): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TCK-${year}-${String(timestamp % 10000).padStart(4, "0")}-${String(random).padStart(3, "0")}`;
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.disconnect();
      this.redis = null;
    }
  }
}

