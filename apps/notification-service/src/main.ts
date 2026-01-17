import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), "../../.env") });

import express from "express";
import cors from "cors";
import { getServiceConfig } from "@ticketing/config";
import { createLogger } from "@ticketing/logger";
import { createKafkaClient, createConsumer, TOPICS } from "@ticketing/events";
import { startTicketConsumer } from "./consumers/ticket.consumer.js";

const config = getServiceConfig("notification-service");
const logger = createLogger({ serviceName: config.SERVICE_NAME });

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "notification-service" });
});

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Notification service started");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error({ port: PORT, error: err }, "Port already in use");
    process.exit(1);
  }
  throw err;
});

const kafka = createKafkaClient(config.KAFKA_BROKERS);
const consumer = createConsumer(kafka, "notification-service");

startTicketConsumer(consumer, config, logger).catch((error) => {
  logger.error({ error }, "Failed to start consumer");
  process.exit(1);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await consumer.disconnect();
  process.exit(0);
});

