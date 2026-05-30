import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import {
  authMember,
  authUser,
  memberRoleAssignments,
  permissionRoles,
  teamMembers,
  teams,
} from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import {
  getSystemRoleDefinitions,
} from "@/lib/enterprise-access";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const workspaceId = searchParams.get("workspaceId") || "";
    const summaryOnly = searchParams.get("summary") === "1";
    const access = await requireWorkspaceAccess(req.headers, workspaceId, "read");

    if (summaryOnly) {
      const teamRows = await db.query.teams.findMany({
        where: eq(teams.organizationId, access.workspaceId),
      });

      return NextResponse.json({
        teams: teamRows,
        permissions: Array.from(access.permissions),
      });
    }

    const [teamRows, teamMemberships, members, roles, assignments, rolePermissions] =
      await Promise.all([
        db.query.teams.findMany({
          where: eq(teams.organizationId, access.workspaceId),
        }),
        db.query.teamMembers.findMany({
          where: eq(teamMembers.organizationId, access.workspaceId),
        }),
        db.query.authMember.findMany({
          where: eq(authMember.organizationId, access.workspaceId),
        }),
        db.query.permissionRoles.findMany({
          where: eq(permissionRoles.organizationId, access.workspaceId),
        }),
        db.query.memberRoleAssignments.findMany({
          where: eq(memberRoleAssignments.organizationId, access.workspaceId),
        }),
        db.query.permissionRolePermissions.findMany(),
      ]);

    const users = members.length
      ? await db
          .select()
          .from(authUser)
          .where(
            inArray(
              authUser.id,
              members.map((member) => member.userId),
            ),
          )
      : [];

    return NextResponse.json({
      teams: teamRows.map((team) => ({
        ...team,
        memberIds: teamMemberships
          .filter((membership) => membership.teamId === team.id)
          .map((membership) => membership.memberId),
      })),
      members: members.map((member) => ({
        ...member,
        user: users.find((user) => user.id === member.userId) || null,
        teamIds: teamMemberships
          .filter((membership) => membership.memberId === member.id)
          .map((membership) => membership.teamId),
        roleAssignments: assignments
          .filter((assignment) => assignment.memberId === member.id)
          .map((assignment) => ({
            ...assignment,
            role: roles.find((role) => role.id === assignment.roleId) || null,
          })),
      })),
      roles: roles.map((role) => ({
        ...role,
        permissions: rolePermissions
          .filter((permission) => permission.roleId === role.id)
          .map((permission) => permission.permission),
      })),
      systemRoles: getSystemRoleDefinitions(),
      permissions: Array.from(access.permissions),
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to load teams" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, name, description } = (await req.json()) as {
      workspaceId?: string;
      name?: string;
      description?: string;
    };

    if (!workspaceId || !name?.trim()) {
      return NextResponse.json({ error: "Workspace and team name are required" }, { status: 400 });
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "teams:manage");
    const normalizedName = name.trim();
    const normalizedSlug = normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const existingTeams = await db.query.teams.findMany({
      where: eq(teams.organizationId, workspaceId),
    });

    if (
      normalizedSlug === "general" ||
      existingTeams.some((team) => team.slug === normalizedSlug)
    ) {
      return NextResponse.json(
        { error: "That team already exists in this workspace" },
        { status: 409 },
      );
    }
    const id = nanoid();
    await db.insert(teams).values({
      id,
      organizationId: workspaceId,
      name: normalizedName,
      slug: normalizedSlug,
      description: description?.trim() || null,
    });

    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "team.created",
      chainKey: `workspace:${workspaceId}`,
      payload: { teamId: id, name: normalizedName },
      ...getRequestAuditContext(req.headers),
    });

    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 },
    );
  }
}
