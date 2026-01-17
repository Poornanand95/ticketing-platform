import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), "../../.env") });

import express from "express";
import cors from "cors";
import { getServiceConfig } from "@ticketing/config";
import { createLogger } from "@ticketing/logger";
import { getDb } from "@ticketing/db";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import orgRoutes from "./routes/orgs.js";

const config = getServiceConfig("auth-service");
const logger = createLogger({ serviceName: config.SERVICE_NAME });
const db = getDb(config.DATABASE_URL);

const app = express();

app.use(cors());

// Handle body parsing with error handling for aborted requests
app.use((req, res, next) => {
  req.on("aborted", () => {
    // Request was aborted by client, ignore silently
  });
  next();
});

app.use(express.json({ limit: "10mb" }));

// Error handler for body parsing errors (including aborted requests)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === "entity.parse.failed" || err.message?.includes("aborted")) {
    // Silently ignore aborted requests or parse errors
    if (!res.headersSent) {
      return res.status(400).json({
        error: "Invalid request",
        code: "INVALID_REQUEST",
      });
    }
    return;
  }
  next(err);
});

app.use("/auth", authRoutes(db, config, logger));
app.use("/users", userRoutes(db, config, logger));
app.use("/orgs", orgRoutes(db, config, logger));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auth-service" });
});

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Auth service started");
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

