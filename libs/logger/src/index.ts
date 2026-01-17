import pino from "pino";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export interface LoggerOptions {
  serviceName: string;
  level?: LogLevel;
  requestId?: string;
}

let defaultLogger: pino.Logger | null = null;

export function createLogger(options: LoggerOptions): pino.Logger {
  const isDevelopment = process.env.NODE_ENV === "development";

  const logger = pino({
    level: options.level || (isDevelopment ? "debug" : "info"),
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
    base: {
      service: options.serviceName,
      ...(options.requestId && { requestId: options.requestId }),
    },
  });

  return logger;
}

export function getLogger(options: LoggerOptions): pino.Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger(options);
  }
  return defaultLogger.child({ requestId: options.requestId });
}

export type Logger = pino.Logger;

