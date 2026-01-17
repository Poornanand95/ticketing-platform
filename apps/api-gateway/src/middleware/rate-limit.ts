import { Request, Response, NextFunction } from "express";
import { createClient } from "redis";
import type { Logger } from "@ticketing/logger";

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient(redisUrl: string) {
  if (!redisClient) {
    redisClient = createClient({ 
      url: redisUrl,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: false,
      },
    });
    try {
      await Promise.race([
        redisClient.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Redis connection timeout")), 2000)
        ),
      ]);
    } catch (error) {
      // If Redis connection fails, return null to skip rate limiting
      redisClient = null;
      throw error;
    }
  }
  return redisClient;
}

export function rateLimitMiddleware(redisUrl: string, logger: Logger) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting if request is already aborted
    if (req.aborted) {
      return next();
    }

    try {
      const client = await Promise.race([
        getRedisClient(redisUrl),
        new Promise<null>((resolve) => 
          setTimeout(() => resolve(null), 1000)
        ),
      ]);

      // If Redis is not available or times out, skip rate limiting
      if (!client) {
        logger.warn("Redis unavailable, skipping rate limiting");
        return next();
      }

      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const userKey = (req as any).user?.user_id;

      const ipKey = `rate_limit:ip:${ip}`;
      const userKeyStr = userKey ? `rate_limit:user:${userKey}` : null;

      // Add timeout to Redis operations
      const ipCount = await Promise.race([
        client.incr(ipKey),
        new Promise<number>((resolve) => setTimeout(() => resolve(0), 500)),
      ]);

      if (ipCount > 0 && ipCount === 1) {
        await Promise.race([
          client.expire(ipKey, 60),
          new Promise<void>((resolve) => setTimeout(() => resolve(), 500)),
        ]);
      }

      if (ipCount > 100) {
        if (!res.headersSent) {
          return res.status(429).json({
            error: "Too many requests",
            code: "RATE_LIMIT_EXCEEDED",
          });
        }
        return;
      }

      if (userKeyStr) {
        const userCount = await Promise.race([
          client.incr(userKeyStr),
          new Promise<number>((resolve) => setTimeout(() => resolve(0), 500)),
        ]);

        if (userCount > 0 && userCount === 1) {
          await Promise.race([
            client.expire(userKeyStr, 60),
            new Promise<void>((resolve) => setTimeout(() => resolve(), 500)),
          ]);
        }

        if (userCount > 1000) {
          if (!res.headersSent) {
            return res.status(429).json({
              error: "Too many requests",
              code: "RATE_LIMIT_EXCEEDED",
            });
          }
          return;
        }
      }

      next();
    } catch (error) {
      logger.warn({ error }, "Rate limiting error, allowing request");
      // Continue even if rate limiting fails
      next();
    }
  };
}

