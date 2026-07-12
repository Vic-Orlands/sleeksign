import type { RequestHandler } from "./$types";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { memberRoleAssignments } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const { workspaceId, memberId, roleId, teamId } = (await req.json()) as {
      workspaceId?: string;
      memberId?: string;
      roleId?: string;
      teamId?: string | null;
    };

    if (!workspaceId || !memberId || !roleId) {
      return Response.json({ error: "workspaceId, memberId, and roleId are required" }, { status: 400 });
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "members:manage");
    await db.insert(memberRoleAssignments).values({
      id: nanoid(),
      organizationId: workspaceId,
      memberId,
      roleId,
      teamId: teamId || null,
    });

    await emitAuditEvent({
      organizationId: workspaceId,
      teamId: teamId || null,
      workspaceId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "member-role.assigned",
      chainKey: `workspace:${workspaceId}`,
      payload: { memberId, roleId, teamId: teamId || null },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to assign role" }, { status: 500 });
  }
}

export const DELETE: RequestHandler = async ({ request: req }) => {
  try {
    const { workspaceId, assignmentId } = (await req.json()) as {
      workspaceId?: string;
      assignmentId?: string;
    };

    if (!workspaceId || !assignmentId) {
      return Response.json({ error: "workspaceId and assignmentId are required" }, { status: 400 });
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "members:manage");
    const assignment = await db.query.memberRoleAssignments.findFirst({
      where: and(
        eq(memberRoleAssignments.id, assignmentId),
        eq(memberRoleAssignments.organizationId, workspaceId),
      ),
    });

    if (!assignment) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    await db.delete(memberRoleAssignments).where(eq(memberRoleAssignments.id, assignmentId));
    await emitAuditEvent({
      organizationId: workspaceId,
      teamId: assignment.teamId,
      workspaceId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "member-role.removed",
      chainKey: `workspace:${workspaceId}`,
      payload: { assignmentId },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to remove assignment" }, { status: 500 });
  }
}
