import type { RequestHandler } from "./$types";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { signerGroupMembers, signerGroups, teams, workspaceSigners } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export const PATCH: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const { workspaceId, name, description, teamId, signerIds } =
      (await req.json()) as {
        workspaceId?: string;
        name?: string;
        description?: string | null;
        teamId?: string | null;
        signerIds?: string[];
      };

    if (!workspaceId) {
      return Response.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "signers:manage");
    const group = await db.query.signerGroups.findFirst({
      where: and(eq(signerGroups.id, id), eq(signerGroups.organizationId, workspaceId)),
    });

    if (!group) {
      return Response.json({ error: "Signer group not found" }, { status: 404 });
    }

    const nextTeamId = teamId === undefined ? group.teamId : teamId;
    if (nextTeamId) {
      const team = await db.query.teams.findFirst({
        where: and(eq(teams.id, nextTeamId), eq(teams.organizationId, workspaceId)),
      });

      if (!team) {
        return Response.json({ error: "Team not found" }, { status: 404 });
      }
    }

    const nextSignerIds = Array.isArray(signerIds) ? signerIds.filter(Boolean) : null;
    if (nextSignerIds) {
      const signerRows = await db.query.workspaceSigners.findMany({
        where: eq(workspaceSigners.organizationId, workspaceId),
      });
      const signerIdSet = new Set(signerRows.map((signer) => signer.id));
      const hasUnknownSigner = nextSignerIds.some((signerId) => !signerIdSet.has(signerId));
      if (hasUnknownSigner) {
        return Response.json({ error: "One or more signers were not found" }, { status: 404 });
      }
    }

    await db
      .update(signerGroups)
      .set({
        name: name?.trim() || group.name,
        description: description === undefined ? group.description : description?.trim() || null,
        teamId: nextTeamId || null,
        updatedAt: new Date(),
      })
      .where(eq(signerGroups.id, id));

    if (nextSignerIds) {
      await db.delete(signerGroupMembers).where(eq(signerGroupMembers.groupId, id));
      if (nextSignerIds.length > 0) {
        await db.insert(signerGroupMembers).values(
          nextSignerIds.map((signerId) => ({
            id: nanoid(),
            groupId: id,
            signerId,
          })),
        );
      }
    }

    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      teamId: nextTeamId || null,
      actorType: "user",
      actorId: access.membership.userId,
      actorEmail: access.session.user.email,
      eventType: "signer-group.updated",
      chainKey: `workspace:${workspaceId}`,
      payload: {
        groupId: id,
        signerCount: nextSignerIds?.length,
        teamId: nextTeamId || null,
      },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to update signer group" }, { status: 500 });
  }
}

export const DELETE: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const workspaceId = new URL(req.url).searchParams.get("workspaceId") || "";
    const access = await requireWorkspaceAccess(req.headers, workspaceId, "signers:manage");

    const group = await db.query.signerGroups.findFirst({
      where: and(eq(signerGroups.id, id), eq(signerGroups.organizationId, workspaceId)),
    });

    if (!group) {
      return Response.json({ error: "Signer group not found" }, { status: 404 });
    }

    await db.delete(signerGroupMembers).where(eq(signerGroupMembers.groupId, id));
    await db.delete(signerGroups).where(eq(signerGroups.id, id));

    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      teamId: group.teamId,
      actorType: "user",
      actorId: access.membership.userId,
      actorEmail: access.session.user.email,
      eventType: "signer-group.deleted",
      chainKey: `workspace:${workspaceId}`,
      payload: {
        groupId: id,
        name: group.name,
      },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to delete signer group" }, { status: 500 });
  }
}
