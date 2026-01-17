import { Router, Request, Response } from "express";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { MetricsService } from "../services/metrics.service.js";

export default function reportRoutes(
  db: NodePgDatabase<typeof schema>,
  config: Env,
  logger: Logger,
) {
  const router = Router();
  const metricsService = new MetricsService(db, logger);

  router.get("/metrics", async (req: Request, res: Response) => {
    try {
      const { org_id, start_date, end_date } = req.query;

      if (!org_id) {
        return res.status(400).json({
          error: "org_id is required",
          code: "VALIDATION_ERROR",
        });
      }

      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      const volume = await metricsService.getTicketVolume(
        org_id as string,
        startDate,
        endDate,
      );
      const avgResponseTime = await metricsService.getAverageResponseTime(
        org_id as string,
        startDate,
        endDate,
      );
      const slaCompliance = await metricsService.getSLACompliance(
        org_id as string,
        startDate,
        endDate,
      );

      res.json({
        volume,
        avgResponseTime,
        slaCompliance,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      });
    } catch (error) {
      logger.error({ error }, "Get metrics failed");
      res.status(500).json({
        error: "Failed to get metrics",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.get("/agent-performance", async (req: Request, res: Response) => {
    try {
      const { org_id, agent_id, start_date, end_date } = req.query;

      if (!org_id || !agent_id) {
        return res.status(400).json({
          error: "org_id and agent_id are required",
          code: "VALIDATION_ERROR",
        });
      }

      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      const performance = await metricsService.getAgentPerformance(
        org_id as string,
        agent_id as string,
        startDate,
        endDate,
      );

      res.json(performance);
    } catch (error) {
      logger.error({ error }, "Get agent performance failed");
      res.status(500).json({
        error: "Failed to get agent performance",
        code: "INTERNAL_ERROR",
      });
    }
  });

  router.get("/export", async (req: Request, res: Response) => {
    try {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=report.csv");
      res.send("Ticket ID,Subject,Status,Created At\n");
    } catch (error) {
      logger.error({ error }, "Export failed");
      res.status(500).json({
        error: "Failed to export",
        code: "INTERNAL_ERROR",
      });
    }
  });

  return router;
}









