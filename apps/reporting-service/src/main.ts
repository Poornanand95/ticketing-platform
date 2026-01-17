import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), "../../.env") });

import express from "express";
import cors from "cors";
import { getServiceConfig } from "@ticketing/config";
import { createLogger } from "@ticketing/logger";
import { getDb } from "@ticketing/db";
import reportRoutes from "./routes/reports.js";

const config = getServiceConfig("reporting-service");
const logger = createLogger({ serviceName: config.SERVICE_NAME });
const db = getDb(config.DATABASE_URL);

const app = express();

app.use(cors());
app.use(express.json());

app.use("/reports", reportRoutes(db, config, logger));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "reporting-service" });
});

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Reporting service started");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error({ port: PORT, error: err }, "Port already in use");
    process.exit(1);
  }
  throw err;
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

