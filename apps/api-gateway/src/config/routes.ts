export interface RouteConfig {
  path: string;
  target: string;
  requiresAuth: boolean;
}

export const routes: RouteConfig[] = [
  {
    path: "/auth",
    target: "http://localhost:3001",
    requiresAuth: false,
  },
  {
    path: "/users",
    target: "http://localhost:3001",
    requiresAuth: true,
  },
  {
    path: "/orgs",
    target: "http://localhost:3001",
    requiresAuth: true,
  },
  {
    path: "/tickets",
    target: "http://localhost:3002",
    requiresAuth: true,
  },
  {
    path: "/buckets",
    target: "http://localhost:3002",
    requiresAuth: true,
  },
  {
    path: "/notifications",
    target: "http://localhost:3003",
    requiresAuth: true,
  },
  {
    path: "/automation",
    target: "http://localhost:3004",
    requiresAuth: true,
  },
  {
    path: "/reports",
    target: "http://localhost:3005",
    requiresAuth: true,
  },
];





