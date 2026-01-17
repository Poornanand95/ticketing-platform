import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), "../../.env") });

import express from "express";
import cors from "cors";
import { getServiceConfig } from "@ticketing/config";
import { createLogger } from "@ticketing/logger";
import { getDb } from "@ticketing/db";
import { createKafkaClient, createConsumer, TOPICS } from "@ticketing/events";
import { startTicketConsumer } from "./consumers/ticket.consumer.js";
import ruleRoutes from "./routes/rules.js";

const config = getServiceConfig("automation-service");
const logger = createLogger({ serviceName: config.SERVICE_NAME });
const db = getDb(config.DATABASE_URL);

const app = express();

app.use(cors());
app.use(express.json());

app.use("/automation/rules", ruleRoutes(db, config, logger));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "automation-service" });
});

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Automation service started");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error({ port: PORT, error: err }, "Port already in use");
    process.exit(1);
  }
  throw err;
});

const kafka = createKafkaClient(config.KAFKA_BROKERS);
const consumer = createConsumer(kafka, "automation-service");

startTicketConsumer(consumer, db, config, logger).catch((error) => {
  logger.error({ error }, "Failed to start consumer");
  process.exit(1);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await consumer.disconnect();
  process.exit(0);
});

