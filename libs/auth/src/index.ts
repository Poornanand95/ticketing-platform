import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "@ticketing/types";

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string,
): string {
  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string,
): string {
  return jwt.sign(payload, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

export function hasRole(userRoles: string[], requiredRole: string): boolean {
  return userRoles.includes(requiredRole);
}

export function hasAnyRole(
  userRoles: string[],
  requiredRoles: string[],
): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

export function hasAllRoles(
  userRoles: string[],
  requiredRoles: string[],
): boolean {
  return requiredRoles.every((role) => userRoles.includes(role));
}

