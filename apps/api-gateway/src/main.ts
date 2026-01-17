import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), "../../.env") });

import express from "express";
import cors from "cors";
import { Readable } from "stream";
import { getServiceConfig } from "@ticketing/config";
import { createLogger } from "@ticketing/logger";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { routes } from "./config/routes.js";

const config = getServiceConfig("api-gateway");
const logger = createLogger({ serviceName: config.SERVICE_NAME });

const app = express();

// CORS configuration - allow all origins for development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  preflightContinue: false, // Let CORS handle preflight
}));

// Handle OPTIONS requests explicitly
app.options("*", (req, res) => {
  res.sendStatus(204);
});

// Handle aborted requests gracefully
app.use((req, res, next) => {
  req.on("aborted", () => {
    // Request was aborted by client, ignore silently
  });
  next();
});

app.use(requestIdMiddleware());

// Parse JSON body for all routes
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

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

// Rate limiting - disabled temporarily for debugging
// TODO: Re-enable after fixing Redis connection issues
// app.use(rateLimitMiddleware(config.REDIS_URL, logger));

for (const route of routes) {
  if (route.requiresAuth) {
    app.use(route.path, authMiddleware(config.JWT_SECRET, logger));
  }

  // Middleware to restore stream after Express body parser consumes it
  app.use(route.path, (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      // Express has already consumed the stream and parsed the body
      // Create a new readable stream from the parsed body so http-proxy-middleware can pipe it
      const bodyString = JSON.stringify(req.body);
      const bodyBuffer = Buffer.from(bodyString);
      const bodyStream = new Readable({
        read() {
          this.push(bodyBuffer);
          this.push(null);
        }
      });
      // Replace the request's stream methods to use our new stream
      (req as any).pipe = bodyStream.pipe.bind(bodyStream);
      (req as any).read = bodyStream.read.bind(bodyStream);
      (req as any)._read = bodyStream._read.bind(bodyStream);
    }
    next();
  });

  app.use(
    route.path,
    createProxyMiddleware({
      target: route.target,
      changeOrigin: true,
      timeout: 30000,
      proxyTimeout: 30000,
      // Preserve the full path including the route prefix
      // Express strips the matched prefix (e.g., /auth), so we add it back
      // e.g., /auth/login -> Express strips to /login -> rewrite to /auth/login
      pathRewrite: (path) => {
        // path is already stripped by Express (e.g., /login from /auth/login)
        // We need to prepend the route path to get the full path
        // Handle root path case: /auth -> Express strips to / -> rewrite to /auth
        if (path === "/" || path === "") {
          return route.path;
        }
        return route.path + path;
      },
      // @ts-ignore - http-proxy-middleware types are incomplete
      onProxyReq: (proxyReq: any, req: any, res: any) => {
        const requestId = (req as any).requestId;
        if (requestId) {
          proxyReq.setHeader("X-Request-ID", requestId);
        }
        
        // Set content type if body exists
        if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
          proxyReq.setHeader("Content-Type", "application/json");
        }
        
        logger.info({ 
          method: req.method, 
          path: req.path, 
          target: route.target,
          contentType: req.headers["content-type"],
          hasBody: !!req.body,
        }, "Proxying request");
      },
      onProxyRes: (proxyRes: any, req: any, res: any) => {
        logger.info({ 
          statusCode: proxyRes.statusCode, 
          path: req.path 
        }, "Proxy response received");
      },
      onError: (err: any, req: any, res: any) => {
        logger.error({ error: err, path: req.path, target: route.target }, "Proxy error");
        if (!res.headersSent) {
          res.status(503).json({
            error: "Service unavailable",
            code: "SERVICE_UNAVAILABLE",
          });
        }
      },
    }),
  );
}

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "API Gateway started");
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

