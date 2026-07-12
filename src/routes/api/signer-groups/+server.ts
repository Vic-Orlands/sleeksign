import type { RequestHandler } from "./$types";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
  signerGroupMembers,
  signerGroups,
  teams,
  workspaceSigners,
} from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export const GET: RequestHandler = async ({ request: req }) => {
  try {
    const workspaceId = new URL(req.url).searchParams.get("workspaceId") || "";
    const access = await requireWorkspaceAccess(req.headers, workspaceId, "signers:view");

    const [groups, memberships, signers] = await Promise.all([
      db.query.signerGroups.findMany({
        where: eq(signerGroups.organizationId, access.workspaceId),
        with: {
          team: true,
        },
      }),
      db.query.signerGroupMembers.findMany(),
      db.query.workspaceSigners.findMany({
        where: eq(workspaceSigners.organizationId, access.workspaceId),
      }),
    ]);

    const filteredGroups = groups.filter((group) =>
      access.permissions.has("signers:view_all")
        ? true
        : !group.teamId || access.teamIds.includes(group.teamId),
    );

    return Response.json({
      groups: filteredGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        teamId: group.teamId,
        teamName: group.team?.name || null,
        signers: memberships
          .filter((membership) => membership.groupId === group.id)
          .map((membership) => signers.find((signer) => signer.id === membership.signerId))
          .filter(Boolean)
          .map((signer) => ({
            id: signer!.id,
            name: signer!.name,
            email: signer!.email,
            title: signer!.title,
            teamId: signer!.teamId,
          })),
      })),
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to load signer groups" }, { status: 500 });
  }
}

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const { workspaceId, name, description, teamId, signerIds } =
      (await req.json()) as {
        workspaceId?: string;
        name?: string;
        description?: string;
        teamId?: string | null;
        signerIds?: string[];
      };

    if (!workspaceId || !name?.trim()) {
      return Response.json(
        { error: "Workspace and group name are required" },
        { status: 400 },
      );
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "signers:manage");
    const nextTeamId = teamId || null;

    if (nextTeamId) {
      const team = await db.query.teams.findFirst({
        where: and(eq(teams.id, nextTeamId), eq(teams.organizationId, workspaceId)),
      });

      if (!team) {
        return Response.json({ error: "Team not found" }, { status: 404 });
      }
    }

    const validSignerIds = Array.isArray(signerIds) ? signerIds.filter(Boolean) : [];
    if (validSignerIds.length > 0) {
      const signerRows = await db.query.workspaceSigners.findMany({
        where: eq(workspaceSigners.organizationId, workspaceId),
      });
      const signerIdSet = new Set(signerRows.map((signer) => signer.id));
      const hasUnknownSigner = validSignerIds.some((signerId) => !signerIdSet.has(signerId));
      if (hasUnknownSigner) {
        return Response.json({ error: "One or more signers were not found" }, { status: 404 });
      }
    }

    const id = nanoid();
    await db.insert(signerGroups).values({
      id,
      organizationId: workspaceId,
      teamId: nextTeamId,
      name: name.trim(),
      description: description?.trim() || null,
    });

    if (validSignerIds.length > 0) {
      await db.insert(signerGroupMembers).values(
        validSignerIds.map((signerId) => ({
          id: nanoid(),
          groupId: id,
          signerId,
        })),
      );
    }

    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      teamId: nextTeamId,
      actorType: "user",
      actorId: access.membership.userId,
      actorEmail: access.session.user.email,
      eventType: "signer-group.created",
      chainKey: `workspace:${workspaceId}`,
      payload: {
        groupId: id,
        name: name.trim(),
        signerCount: validSignerIds.length,
      },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ id });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to create signer group" }, { status: 500 });
  }
}
