import { NextRequest, NextResponse } from "next/server";

import { AccessError, requireDocumentAccess } from "@/lib/server-access";
import { db } from "@/db";
import { signingPackets } from "@/db/schema";
import { createSigningPacket } from "@/lib/signing-workflows";
import {
  DEFAULT_ROLE_CONFIGS,
  parseRoleConfigs,
  type RoleConfig,
  type WorkflowMode,
} from "@/lib/field-utils";
import { desc, eq } from "drizzle-orm";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const documentId = new URL(req.url).searchParams.get("documentId") || "";

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 },
      );
    }

    await requireDocumentAccess(req.headers, documentId, "read");

    const packets = await db.query.signingPackets.findMany({
      where: eq(signingPackets.documentId, documentId),
      orderBy: [desc(signingPackets.createdAt)],
    });

    return NextResponse.json(
      packets.map((packet) => ({
        ...packet,
        roleConfigs: parseRoleConfigs(packet.roleConfigs),
      })),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Signing packet list error:", error);
    return NextResponse.json(
      { error: "Failed to load packets" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      documentId,
      mode,
      roleConfigs,
    }: {
      documentId?: string;
      mode?: WorkflowMode;
      roleConfigs?: RoleConfig[];
    } = await req.json();

    if (!documentId || !mode) {
      return NextResponse.json(
        { error: "Document ID and mode are required" },
        { status: 400 },
      );
    }

    const access = await requireDocumentAccess(req.headers, documentId, "manage");

    const packetId = await createSigningPacket(
      documentId,
      mode,
      parseRoleConfigs(JSON.stringify(roleConfigs || DEFAULT_ROLE_CONFIGS)),
      {
        workspaceId: access.workspaceId,
        teamId: access.document.teamId,
        requireOtp: access.document.requireOtp,
      },
    );

    await emitAuditEvent({
      organizationId: access.workspaceId,
      teamId: access.document.teamId,
      workspaceId: access.workspaceId,
      documentId,
      packetId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "packet.created",
      chainKey: `packet:${packetId}`,
      payload: {
        mode,
        roleConfigs,
        requireOtp: access.document.requireOtp,
      },
      ...getRequestAuditContext(req.headers),
    });

    return NextResponse.json({ packetId });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Signing packet create error:", error);
    return NextResponse.json(
      { error: "Failed to create packet" },
      { status: 500 },
    );
  }
}
