import type { RequestHandler } from "./$types";

import { AccessError, requireDocumentAccess } from "@/lib/server-access";
import { db } from "@/db";
import { signingPackets } from "@/db/schema";
import { createSigningPacket } from "@/lib/signing-workflows";
import {
  parseRoleConfigs,
  type WorkflowMode,
} from "@/lib/field-utils";
import { desc, eq } from "drizzle-orm";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";

export const GET: RequestHandler = async ({ request: req }) => {
  try {
    const documentId = new URL(req.url).searchParams.get("documentId") || "";

    if (!documentId) {
      return Response.json(
        { error: "Document ID required" },
        { status: 400 },
      );
    }

    await requireDocumentAccess(req.headers, documentId, "read");

    const packets = await db.query.signingPackets.findMany({
      where: eq(signingPackets.documentId, documentId),
      orderBy: [desc(signingPackets.createdAt)],
    });

    return Response.json(
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
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Signing packet list error:", error);
    return Response.json(
      { error: "Failed to load packets" },
      { status: 500 },
    );
  }
}

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const {
      documentId,
      mode,
    }: {
      documentId?: string;
      mode?: WorkflowMode;
    } = await req.json();

    if (!documentId || !mode) {
      return Response.json(
        { error: "Document ID and mode are required" },
        { status: 400 },
      );
    }

    const access = await requireDocumentAccess(req.headers, documentId, "manage");

    const roleConfigs = parseRoleConfigs(access.document.roleConfigs);

    const packetId = await createSigningPacket(
      documentId,
      mode,
      roleConfigs,
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

    return Response.json({ packetId, roleConfigs });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Signing packet create error:", error);
    return Response.json(
      { error: "Failed to create packet" },
      { status: 500 },
    );
  }
}
