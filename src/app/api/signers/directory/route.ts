import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { teams, workspaceSigners } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = new URL(req.url).searchParams.get("workspaceId") || "";
    const access = await requireWorkspaceAccess(req.headers, workspaceId, "signers:view");

    const signerRows = await db.query.workspaceSigners.findMany({
      where: eq(workspaceSigners.organizationId, access.workspaceId),
      with: {
        team: true,
      },
    });

    const filteredRows = signerRows.filter((signer) =>
      access.permissions.has("signers:view_all")
        ? true
        : !signer.teamId || access.teamIds.includes(signer.teamId),
    );

    return NextResponse.json({
      signers: filteredRows.map((signer) => ({
        id: signer.id,
        name: signer.name,
        email: signer.email,
        title: signer.title,
        type: signer.type,
        status: signer.status,
        teamId: signer.teamId,
        teamName: signer.team?.name || null,
        createdAt: signer.createdAt,
        updatedAt: signer.updatedAt,
      })),
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to load signer directory" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, name, email, title, teamId, type } =
      (await req.json()) as {
        workspaceId?: string;
        name?: string;
        email?: string;
        title?: string;
        teamId?: string | null;
        type?: "internal" | "external";
      };

    if (!workspaceId || !name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Workspace, signer name, and signer email are required" },
        { status: 400 },
      );
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "signers:manage");
    const normalizedEmail = email.trim().toLowerCase();
    const nextTeamId = teamId || null;

    if (nextTeamId) {
      const team = await db.query.teams.findFirst({
        where: and(eq(teams.id, nextTeamId), eq(teams.organizationId, workspaceId)),
      });

      if (!team) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
    }

    const existingSigner = await db.query.workspaceSigners.findFirst({
      where: and(
        eq(workspaceSigners.organizationId, workspaceId),
        eq(workspaceSigners.email, normalizedEmail),
      ),
    });

    if (existingSigner) {
      return NextResponse.json(
        { error: "A signer with that email already exists in this workspace" },
        { status: 409 },
      );
    }

    const id = nanoid();
    await db.insert(workspaceSigners).values({
      id,
      organizationId: workspaceId,
      teamId: nextTeamId,
      name: name.trim(),
      email: normalizedEmail,
      title: title?.trim() || null,
      type: type || "internal",
    });

    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      teamId: nextTeamId,
      actorType: "user",
      actorId: access.membership.userId,
      actorEmail: access.session.user.email,
      eventType: "signer.created",
      chainKey: `workspace:${workspaceId}`,
      payload: {
        signerId: id,
        name: name.trim(),
        email: normalizedEmail,
        teamId: nextTeamId,
      },
      ...getRequestAuditContext(req.headers),
    });

    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to create signer" }, { status: 500 });
  }
}
