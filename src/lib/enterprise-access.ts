import { and, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
  authMember,
  authOrganization,
  organizationBranding,
  teamMembers,
  teams,
} from "@/db/schema";

export const APP_PERMISSIONS = [
  "documents:view",
  "documents:view_all",
  "documents:manage",
  "templates:view",
  "templates:manage",
  "packets:send",
  "packets:view_all",
  "signers:view",
  "signers:view_all",
  "signers:manage",
  "audit:view",
  "audit:view_all",
  "teams:manage",
  "branding:manage",
  "billing:manage",
  "members:manage",
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];
export type Role = "owner" | "admin" | "member";

const ROLE_PERMISSIONS: Record<Role, AppPermission[]> = {
  owner: [...APP_PERMISSIONS],
  admin: APP_PERMISSIONS.filter((permission) => permission !== "billing:manage"),
  member: [
    "documents:view",
    "documents:manage",
    "templates:view",
    "templates:manage",
    "packets:send",
    "signers:view",
    "signers:manage",
    "audit:view",
  ],
};

type ResolvedAccess = {
  membership: typeof authMember.$inferSelect;
  workspace: typeof authOrganization.$inferSelect | null;
  teamIds: string[];
  defaultTeamId: string | null;
  permissions: Set<AppPermission>;
};

function normalizeRole(role: string | null | undefined): Role {
  return role === "owner" || role === "admin" ? role : "member";
}

export function getBaseRolePermissions(role: string | null | undefined) {
  return [...ROLE_PERMISSIONS[normalizeRole(role)]];
}

export function hasWorkspaceManageRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === "owner" || normalized === "admin";
}

export function hasWorkspaceOwnerRole(role?: string | null) {
  return normalizeRole(role) === "owner";
}

export async function ensureWorkspaceSetup(
  workspaceId: string,
  memberId?: string | null,
) {
  const [workspace, defaultTeam, branding] = await Promise.all([
    db.query.authOrganization.findFirst({
      where: eq(authOrganization.id, workspaceId),
    }),
    db.query.teams.findFirst({
      where: and(
        eq(teams.organizationId, workspaceId),
        or(eq(teams.isDefault, true), eq(teams.slug, "general")),
      ),
    }),
    db.query.organizationBranding.findFirst({
      where: eq(organizationBranding.organizationId, workspaceId),
    }),
  ]);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  let defaultTeamId = defaultTeam?.id || null;
  if (!defaultTeam) {
    defaultTeamId = nanoid();
    await db.insert(teams).values({
      id: defaultTeamId,
      organizationId: workspaceId,
      name: "General",
      slug: "general",
      description: "Default team",
      isDefault: true,
    });
  } else if (!defaultTeam.isDefault) {
    await db
      .update(teams)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(teams.id, defaultTeam.id));
  }

  if (!branding) {
    await db.insert(organizationBranding).values({
      id: nanoid(),
      organizationId: workspaceId,
      senderName: workspace.name,
    });
  }

  if (memberId && defaultTeamId) {
    const existingMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.organizationId, workspaceId),
        eq(teamMembers.teamId, defaultTeamId),
        eq(teamMembers.memberId, memberId),
      ),
    });

    if (!existingMembership) {
      await db.insert(teamMembers).values({
        id: nanoid(),
        organizationId: workspaceId,
        teamId: defaultTeamId,
        memberId,
      });
    }
  }

  return { defaultTeamId };
}

export async function resolveWorkspaceAccess(
  userId: string,
  workspaceId: string,
  options?: { ensureSetup?: boolean },
): Promise<ResolvedAccess | null> {
  const membership = await db.query.authMember.findFirst({
    where: and(
      eq(authMember.userId, userId),
      eq(authMember.organizationId, workspaceId),
    ),
  });

  if (!membership) return null;

  const setup = options?.ensureSetup === true
    ? await ensureWorkspaceSetup(workspaceId, membership.id)
    : null;

  const [workspace, membershipTeams, defaultTeam] = await Promise.all([
    db.query.authOrganization.findFirst({
      where: eq(authOrganization.id, workspaceId),
    }),
    db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.organizationId, workspaceId),
        eq(teamMembers.memberId, membership.id),
      ),
    }),
    setup
      ? Promise.resolve(null)
      : db.query.teams.findFirst({
          where: and(
            eq(teams.organizationId, workspaceId),
            eq(teams.isDefault, true),
          ),
        }),
  ]);
  const defaultTeamId = setup?.defaultTeamId || defaultTeam?.id || null;

  const permissions = new Set<AppPermission>(getBaseRolePermissions(membership.role));

  const teamIds = [
    ...new Set(
      membershipTeams.map((membershipTeam) => membershipTeam.teamId).filter(Boolean),
    ),
  ];

  if (teamIds.length === 0 && defaultTeamId) {
    teamIds.push(defaultTeamId);
  }

  return {
    membership,
    workspace: workspace || null,
    teamIds,
    defaultTeamId,
    permissions,
  };
}

export function hasAppPermission(
  access: Pick<ResolvedAccess, "permissions" | "membership">,
  permission: AppPermission,
) {
  if (hasWorkspaceOwnerRole(access.membership.role)) return true;
  return access.permissions.has(permission);
}

export type { ResolvedAccess };
