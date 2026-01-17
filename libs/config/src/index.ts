import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("3000"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getConfig(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

const SERVICE_PORT_DEFAULTS: Record<string, number> = {
  "api-gateway": 3000,
  "auth-service": 3001,
  "ticket-service": 3002,
  "notification-service": 3003,
  "automation-service": 3004,
  "reporting-service": 3005,
};

export function getServiceConfig(serviceName: string) {
  const config = getConfig();
  const servicePortEnv = process.env[`${serviceName.toUpperCase().replace(/-/g, "_")}_PORT`];
  const defaultPort = SERVICE_PORT_DEFAULTS[serviceName] || 3000;
  const servicePort = servicePortEnv ? Number(servicePortEnv) : defaultPort;

  return {
    ...config,
    SERVICE_NAME: serviceName,
    PORT: servicePort,
    LOG_LEVEL: process.env.LOG_LEVEL || (config.NODE_ENV === "production" ? "info" : "debug"),
  };
}

