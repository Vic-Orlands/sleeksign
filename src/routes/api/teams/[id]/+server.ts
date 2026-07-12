import type { RequestHandler } from "./$types";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { memberRoleAssignments, teamMembers, teams } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export const PATCH: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const { workspaceId, name, description, memberIds, roleAssignmentIds } =
      (await req.json()) as {
        workspaceId?: string;
        name?: string;
        description?: string;
        memberIds?: string[];
        roleAssignmentIds?: string[];
      };

    if (!workspaceId) {
      return Response.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "teams:manage");
    const team = await db.query.teams.findFirst({
      where: and(eq(teams.id, id), eq(teams.organizationId, workspaceId)),
    });

    if (!team) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }

    const nextName = name?.trim() || team.name;
    if (team.isDefault && nextName.toLowerCase() !== "general") {
      return Response.json(
        { error: "The default General team cannot be renamed" },
        { status: 400 },
      );
    }

    await db
      .update(teams)
      .set({
        name: nextName,
        slug: nextName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        description: description?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id));

    if (Array.isArray(memberIds)) {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
      if (memberIds.length > 0) {
        await db.insert(teamMembers).values(
          memberIds.map((memberId) => ({
            id: crypto.randomUUID(),
            organizationId: workspaceId,
            teamId: id,
            memberId,
          })),
        );
      }
    }

    if (Array.isArray(roleAssignmentIds)) {
      await db.delete(memberRoleAssignments).where(eq(memberRoleAssignments.teamId, id));
      if (roleAssignmentIds.length > 0) {
        const now = new Date();
        await db.insert(memberRoleAssignments).values(
          roleAssignmentIds.map((assignmentId) => ({
            id: crypto.randomUUID(),
            organizationId: workspaceId,
            memberId: assignmentId.split(":")[0] || "",
            roleId: assignmentId.split(":")[1] || "",
            teamId: id,
            createdAt: now,
          })),
        );
      }
    }

    await emitAuditEvent({
      organizationId: workspaceId,
      teamId: id,
      workspaceId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "team.updated",
      chainKey: `workspace:${workspaceId}`,
      payload: { teamId: id, name: nextName },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to update team" }, { status: 500 });
  }
}

export const DELETE: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const workspaceId = new URL(req.url).searchParams.get("workspaceId") || "";
    const access = await requireWorkspaceAccess(req.headers, workspaceId, "teams:manage");

    const team = await db.query.teams.findFirst({
      where: and(eq(teams.id, id), eq(teams.organizationId, workspaceId)),
    });

    if (!team || team.isDefault) {
      return Response.json(
        { error: "Team not found or cannot delete default team" },
        { status: 400 },
      );
    }

    await db.delete(teams).where(eq(teams.id, id));
    await emitAuditEvent({
      organizationId: workspaceId,
      teamId: id,
      workspaceId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "team.deleted",
      chainKey: `workspace:${workspaceId}`,
      payload: { teamId: id, name: team.name },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
