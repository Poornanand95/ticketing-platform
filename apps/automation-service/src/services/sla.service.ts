import { createClient } from "redis";
import type { Logger } from "@ticketing/logger";
import type { Ticket } from "@ticketing/types";

export class SLAService {
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

  async startSLATimer(ticketId: string, responseTimeHours: number) {
    const redis = await this.getRedis();
    const key = `sla:ticket:${ticketId}:response`;
    const ttl = responseTimeHours * 3600;
    await redis.setEx(key, ttl, "pending");
    this.logger.info({ ticket_id: ticketId, ttl }, "SLA timer started");
  }

  async checkSLABreach(ticketId: string): Promise<boolean> {
    const redis = await this.getRedis();
    const key = `sla:ticket:${ticketId}:response`;
    const exists = await redis.exists(key);
    return exists === 0;
  }

  async clearSLATimer(ticketId: string) {
    const redis = await this.getRedis();
    const key = `sla:ticket:${ticketId}:response`;
    await redis.del(key);
    this.logger.info({ ticket_id: ticketId }, "SLA timer cleared");
  }
}









