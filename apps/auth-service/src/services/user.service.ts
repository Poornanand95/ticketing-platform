import { eq, and, isNull, sql, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import { hashPassword } from "@ticketing/auth";
import type { Logger } from "@ticketing/logger";
import { users, userRoles, roles } from "@ticketing/db";
import { nanoid } from "nanoid";

export class UserService {
  constructor(
    private db: NodePgDatabase<typeof schema>,
    private logger: Logger,
  ) {}

  async createUser(data: {
    org_id: string;
    email: string;
    name: string;
    password: string;
    roleNames?: string[];
    skills?: string[];
    is_active?: boolean;
  }) {
    const passwordHash = await hashPassword(data.password);

    const [user] = await this.db
      .insert(users)
      .values({
        id: nanoid(),
        org_id: data.org_id,
        email: data.email,
        name: data.name,
        password_hash: passwordHash,
        skills: data.skills || [],
        is_active: data.is_active ?? true,
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    if (data.roleNames && data.roleNames.length > 0) {
      // Filter to only valid role enum values
      const validRoles = ["admin", "agent", "customer"] as const;
      const validRoleNames = data.roleNames.filter((role): role is typeof validRoles[number] =>
        validRoles.includes(role as typeof validRoles[number])
      );

      if (validRoleNames.length > 0) {
        const roleList = await this.db
          .select()
          .from(roles)
          .where(inArray(roles.name, validRoleNames));

        if (roleList.length > 0) {
          await this.db.insert(userRoles).values(
            roleList.map((role) => ({
              user_id: user.id,
              role_id: role.id,
            }))
          );
        }
      }
    }

    return {
      id: user.id,
      org_id: user.org_id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    };
  }

  async getUserById(userId: string, orgId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.org_id, orgId)))
      .limit(1);

    if (!user || user.deleted_at) {
      return null;
    }

    const userRolesList = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.role_id, roles.id))
      .where(eq(userRoles.user_id, user.id));

    return {
      id: user.id,
      org_id: user.org_id,
      email: user.email,
      name: user.name,
      skills: user.skills || [],
      is_active: user.is_active ?? true,
      roles: userRolesList.map((ur) => ur.name),
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async getAgents(orgId: string, filters?: { skill?: string }) {
    const agentRole = await this.db
      .select()
      .from(roles)
      .where(eq(roles.name, "agent"))
      .limit(1);

    if (agentRole.length === 0 || !agentRole[0]) {
      return [];
    }

    const conditions = [
      eq(users.org_id, orgId),
      eq(userRoles.role_id, agentRole[0].id),
      isNull(users.deleted_at),
      eq(users.is_active, true),
    ];

    const skill = filters?.skill?.trim();
    if (skill) {
      // Case-insensitive skill matching using jsonb array containment
      // Convert skill to lowercase for comparison and check if any skill in the array matches (case-insensitive)
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${users.skills}) AS skill_item
          WHERE LOWER(skill_item) = LOWER(${skill})
        )`
      );
    }

    const agentUsers = await this.db
      .select({
        id: users.id,
        org_id: users.org_id,
        email: users.email,
        name: users.name,
        skills: users.skills,
        is_active: users.is_active,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.user_id))
      .where(and(...conditions));

    return agentUsers.map((user) => ({
      id: user.id,
      org_id: user.org_id,
      email: user.email,
      name: user.name,
      skills: user.skills || [],
      is_active: user.is_active ?? true,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }));
  }

  async updateAgent(
    userId: string,
    orgId: string,
    data: {
      skills?: string[];
      is_active?: boolean;
    },
  ) {
    const updateData: {
      skills?: string[];
      is_active?: boolean;
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };

    if (data.skills !== undefined) {
      updateData.skills = data.skills;
    }

    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    const [user] = await this.db
      .update(users)
      .set(updateData)
      .where(and(eq(users.id, userId), eq(users.org_id, orgId)))
      .returning();

    if (!user || user.deleted_at) {
      return null;
    }

    const userRolesList = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.role_id, roles.id))
      .where(eq(userRoles.user_id, user.id));

    return {
      id: user.id,
      org_id: user.org_id,
      email: user.email,
      name: user.name,
      skills: user.skills || [],
      is_active: user.is_active ?? true,
      roles: userRolesList.map((ur) => ur.name),
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}

