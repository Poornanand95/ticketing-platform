import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, dev }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/dist/**",
          "**/build/**",
          path.resolve(__dirname, "../../infra/**"),
          path.resolve(__dirname, "../../libs/**"),
          path.resolve(__dirname, "../../apps/api-gateway/**"),
          path.resolve(__dirname, "../../apps/auth-service/**"),
          path.resolve(__dirname, "../../apps/ticket-service/**"),
          path.resolve(__dirname, "../../apps/notification-service/**"),
          path.resolve(__dirname, "../../apps/automation-service/**"),
          path.resolve(__dirname, "../../apps/reporting-service/**"),
          path.resolve(__dirname, "../agent-console/**"),
          "**/.git/**",
          "**/drizzle/**",
        ],
        aggregateTimeout: 300,
        poll: false,
      };
    }
    return config;
  },
};

export default nextConfig;

