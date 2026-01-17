import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers["x-request-id"] as string || randomUUID();
    (req as any).requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
  };
}

