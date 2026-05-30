import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { signerGroupMembers, teams, workspaceSigners } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { workspaceId, name, email, title, teamId, status } =
      (await req.json()) as {
        workspaceId?: string;
        name?: string;
        email?: string;
        title?: string | null;
        teamId?: string | null;
        status?: "active" | "archived";
      };

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "signers:manage");
    const signer = await db.query.workspaceSigners.findFirst({
      where: and(eq(workspaceSigners.id, id), eq(workspaceSigners.organizationId, workspaceId)),
    });

    if (!signer) {
      return NextResponse.json({ error: "Signer not found" }, { status: 404 });
    }

    const nextTeamId = teamId === undefined ? signer.teamId : teamId;
    if (nextTeamId) {
      const team = await db.query.teams.findFirst({
        where: and(eq(teams.id, nextTeamId), eq(teams.organizationId, workspaceId)),
      });

      if (!team) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
    }

    const nextEmail = email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== signer.email) {
      const existingSigner = await db.query.workspaceSigners.findFirst({
        where: and(
          eq(workspaceSigners.organizationId, workspaceId),
          eq(workspaceSigners.email, nextEmail),
        ),
      });

      if (existingSigner) {
        return NextResponse.json(
          { error: "A signer with that email already exists in this workspace" },
          { status: 409 },
        );
      }
    }

    await db
      .update(workspaceSigners)
      .set({
        name: name?.trim() || signer.name,
        email: nextEmail || signer.email,
        title: title === undefined ? signer.title : title?.trim() || null,
        teamId: nextTeamId || null,
        status: status || signer.status,
        updatedAt: new Date(),
      })
      .where(eq(workspaceSigners.id, id));

    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      teamId: nextTeamId || null,
      actorType: "user",
      actorId: access.membership.userId,
      actorEmail: access.session.user.email,
      eventType: "signer.updated",
      chainKey: `workspace:${workspaceId}`,
      payload: {
        signerId: id,
        previousTeamId: signer.teamId,
        teamId: nextTeamId || null,
        status: status || signer.status,
      },
      ...getRequestAuditContext(req.headers),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to update signer" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const workspaceId = new URL(req.url).searchParams.get("workspaceId") || "";
    const access = await requireWorkspaceAccess(req.headers, workspaceId, "signers:manage");

    const signer = await db.query.workspaceSigners.findFirst({
      where: and(eq(workspaceSigners.id, id), eq(workspaceSigners.organizationId, workspaceId)),
    });

    if (!signer) {
      return NextResponse.json({ error: "Signer not found" }, { status: 404 });
    }

    await db.delete(signerGroupMembers).where(eq(signerGroupMembers.signerId, id));
    await db.delete(workspaceSigners).where(eq(workspaceSigners.id, id));

    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      teamId: signer.teamId,
      actorType: "user",
      actorId: access.membership.userId,
      actorEmail: access.session.user.email,
      eventType: "signer.deleted",
      chainKey: `workspace:${workspaceId}`,
      payload: {
        signerId: id,
        name: signer.name,
        email: signer.email,
      },
      ...getRequestAuditContext(req.headers),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to delete signer" }, { status: 500 });
  }
}
