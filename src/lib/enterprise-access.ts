import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
  authMember,
  authOrganization,
  memberRoleAssignments,
  organizationBranding,
  permissionRolePermissions,
  permissionRoles,
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
export type EnterpriseRoleKey =
  | "workspace-admin"
  | "viewer"
  | "template-manager"
  | "billing-manager"
  | "team-manager";

type SystemRoleDefinition = {
  key: EnterpriseRoleKey;
  name: string;
  scope: "organization" | "team";
  description: string;
  permissions: AppPermission[];
};

const SYSTEM_ROLE_DEFINITIONS: SystemRoleDefinition[] = [
  {
    key: "workspace-admin",
    name: "Workspace Admin",
    scope: "organization",
    description: "Full operational access across documents, signers, branding, and audit.",
    permissions: [...APP_PERMISSIONS],
  },
  {
    key: "viewer",
    name: "View Only",
    scope: "organization",
    description: "Read-only access to team-scoped documents and packet activity.",
    permissions: ["documents:view", "templates:view", "signers:view", "audit:view"],
  },
  {
    key: "template-manager",
    name: "Template Manager",
    scope: "organization",
    description: "Can manage templates, documents, and outbound packet sending.",
    permissions: [
      "documents:view",
      "documents:manage",
      "templates:view",
      "templates:manage",
      "packets:send",
      "signers:view",
      "audit:view",
    ],
  },
  {
    key: "billing-manager",
    name: "Billing Manager",
    scope: "organization",
    description: "Can manage commercial settings without document control.",
    permissions: ["billing:manage", "documents:view"],
  },
  {
    key: "team-manager",
    name: "Team Manager",
    scope: "team",
    description: "Can manage team members, documents, and sending for one team.",
    permissions: [
      "documents:view",
      "documents:manage",
      "templates:view",
      "templates:manage",
      "packets:send",
      "signers:view",
      "signers:manage",
      "audit:view",
      "members:manage",
    ],
  },
];

const BASE_ROLE_PERMISSIONS: Record<string, AppPermission[]> = {
  owner: [...APP_PERMISSIONS],
  admin: APP_PERMISSIONS.filter((permission) => permission !== "billing:manage"),
  member: ["documents:view", "templates:view", "packets:send", "signers:view"],
};

type ResolvedAccess = {
  membership: typeof authMember.$inferSelect;
  workspace: typeof authOrganization.$inferSelect | null;
  teamIds: string[];
  defaultTeamId: string | null;
  permissions: Set<AppPermission>;
};

function uniquePermissions(values: AppPermission[]) {
  return [...new Set(values)];
}

export function getBaseRolePermissions(role: string | null | undefined) {
  const parts = String(role || "member")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const permissions = parts.flatMap((part) => BASE_ROLE_PERMISSIONS[part] || []);
  return uniquePermissions(permissions.length ? permissions : BASE_ROLE_PERMISSIONS.member);
}

export function hasWorkspaceManageRole(role?: string | null) {
  return Boolean(
    role
      ?.split(",")
      .map((value) => value.trim())
      .some((value) => value === "owner" || value === "admin"),
  );
}

export function hasWorkspaceOwnerRole(role?: string | null) {
  return Boolean(
    role
      ?.split(",")
      .map((value) => value.trim())
      .some((value) => value === "owner"),
  );
}

export async function ensureWorkspaceEnterpriseSetup(
  workspaceId: string,
  memberId?: string | null,
) {
  const [workspace, defaultTeam, branding, existingRoles] = await Promise.all([
    db.query.authOrganization.findFirst({
      where: eq(authOrganization.id, workspaceId),
    }),
    db.query.teams.findFirst({
      where: and(eq(teams.organizationId, workspaceId), eq(teams.isDefault, true)),
    }),
    db.query.organizationBranding.findFirst({
      where: eq(organizationBranding.organizationId, workspaceId),
    }),
    db.query.permissionRoles.findMany({
      where: eq(permissionRoles.organizationId, workspaceId),
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
  }

  if (!branding) {
    await db.insert(organizationBranding).values({
      id: nanoid(),
      organizationId: workspaceId,
      senderName: workspace.name,
    });
  }

  const roleMap = new Map(existingRoles.map((role) => [role.systemKey, role]));

  for (const definition of SYSTEM_ROLE_DEFINITIONS) {
    let roleRecord = roleMap.get(definition.key);

    if (!roleRecord) {
      const roleId = nanoid();
      await db.insert(permissionRoles).values({
        id: roleId,
        organizationId: workspaceId,
        teamId: definition.scope === "team" ? defaultTeamId : null,
        scope: definition.scope,
        name: definition.name,
        description: definition.description,
        systemKey: definition.key,
        isSystem: true,
      });

      await db.insert(permissionRolePermissions).values(
        definition.permissions.map((permission) => ({
          id: nanoid(),
          roleId,
          permission,
        })),
      );

      roleRecord = {
        id: roleId,
        organizationId: workspaceId,
        teamId: definition.scope === "team" ? defaultTeamId : null,
        scope: definition.scope,
        name: definition.name,
        description: definition.description,
        systemKey: definition.key,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      roleMap.set(definition.key, roleRecord);
    }
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
): Promise<ResolvedAccess | null> {
  const membership = await db.query.authMember.findFirst({
    where: and(
      eq(authMember.userId, userId),
      eq(authMember.organizationId, workspaceId),
    ),
  });

  if (!membership) return null;

  const { defaultTeamId } = await ensureWorkspaceEnterpriseSetup(
    workspaceId,
    membership.id,
  );

  const [workspace, membershipTeams, assignments] = await Promise.all([
    db.query.authOrganization.findFirst({
      where: eq(authOrganization.id, workspaceId),
    }),
    db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.organizationId, workspaceId),
        eq(teamMembers.memberId, membership.id),
      ),
    }),
    db.query.memberRoleAssignments.findMany({
      where: and(
        eq(memberRoleAssignments.organizationId, workspaceId),
        eq(memberRoleAssignments.memberId, membership.id),
      ),
    }),
  ]);

  const roleIds = assignments.map((assignment) => assignment.roleId);
  const roles =
    roleIds.length > 0
      ? await db.query.permissionRoles.findMany({
          where: and(
            eq(permissionRoles.organizationId, workspaceId),
            inArray(permissionRoles.id, roleIds),
          ),
        })
      : [];

  const rolePermissions =
    roleIds.length > 0
      ? await db.query.permissionRolePermissions.findMany({
          where: inArray(permissionRolePermissions.roleId, roleIds),
        })
      : [];

  const permissions = new Set<AppPermission>(getBaseRolePermissions(membership.role));
  rolePermissions.forEach((permission) => {
    if (
      APP_PERMISSIONS.includes(permission.permission as AppPermission) &&
      roles.some((role) => role.id === permission.roleId)
    ) {
      permissions.add(permission.permission as AppPermission);
    }
  });

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

export function getSystemRoleDefinitions() {
  return SYSTEM_ROLE_DEFINITIONS;
}

export type { ResolvedAccess };
