import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken } from "@ticketing/auth";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import { users, userRoles, roles } from "@ticketing/db";

export class AuthService {
  constructor(
    private db: NodePgDatabase<typeof schema>,
    private config: Env,
    private logger: Logger,
  ) {}

  async login(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || user.deleted_at) {
      throw new Error("Invalid credentials");
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const userRolesList = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.role_id, roles.id))
      .where(eq(userRoles.user_id, user.id));

    const roleNames = userRolesList.map((ur) => ur.name);

    const payload = {
      user_id: user.id,
      org_id: user.org_id,
      email: user.email,
      roles: roleNames,
    };

    const accessToken = generateAccessToken(payload, this.config.JWT_SECRET);
    const refreshToken = generateRefreshToken(
      payload,
      this.config.JWT_REFRESH_SECRET,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        org_id: user.org_id,
        roles: roleNames,
      },
    };
  }

  async refresh(refreshToken: string) {
    const { verifyToken } = await import("@ticketing/auth");
    const payload = verifyToken(refreshToken, this.config.JWT_REFRESH_SECRET);

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.user_id))
      .limit(1);

    if (!user || user.deleted_at) {
      throw new Error("Invalid token");
    }

    const userRolesList = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.role_id, roles.id))
      .where(eq(userRoles.user_id, user.id));

    const roleNames = userRolesList.map((ur) => ur.name);

    const newPayload = {
      user_id: user.id,
      org_id: user.org_id,
      email: user.email,
      roles: roleNames,
    };

    const accessToken = generateAccessToken(newPayload, this.config.JWT_SECRET);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        org_id: user.org_id,
        roles: roleNames,
      },
    };
  }
}

