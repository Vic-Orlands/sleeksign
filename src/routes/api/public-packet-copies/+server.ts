import type { RequestHandler } from "./$types";

import { createPacketCopy, getPacket } from "@/lib/signing-workflows";
import { getStorageScopeForRole } from "@/lib/signing-workflows";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import {
  establishSignerIdentity,
  parseSignerIdentity,
} from "@/lib/signer-identity";

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const {
      packetId,
      roleName,
      signerName,
      signerEmail,
    }: {
      packetId?: string;
      roleName?: string;
      signerName?: string;
      signerEmail?: string;
    } = await req.json();

    if (!packetId || !roleName) {
      return Response.json(
        { error: "Packet ID and role name are required" },
        { status: 400 },
      );
    }

    const identity = parseSignerIdentity({
      name: signerName,
      email: signerEmail,
    });
    const packet = await getPacket(packetId);
    if (packet.status !== "active") {
      return Response.json(
        { error: "Signing link is no longer active" },
        { status: 409 },
      );
    }
    if (!packet.roleConfigs.some((role) => role.name === roleName)) {
      return Response.json({ error: "Signer role not found" }, { status: 404 });
    }
    const scope = getStorageScopeForRole(packet.roleConfigs, roleName, packet.mode);

    if (scope === "shared") {
      await establishSignerIdentity({
        packetId: packet.id,
        roleName,
        name: identity.name,
        email: identity.email,
        requestHeaders: req.headers,
      });
      return Response.json({ copyId: null, shared: true });
    }

    const copyId = await createPacketCopy({
      packetId,
      roleName,
      signerName: identity.name,
      signerEmail: identity.email,
      teamId: packet.teamId,
    });

    await emitAuditEvent({
      organizationId: packet.workspaceId,
      teamId: packet.teamId,
      workspaceId: packet.workspaceId,
      documentId: packet.document.id,
      packetId: packet.id,
      packetCopyId: copyId,
      actorType: "signer",
      actorEmail: identity.email,
      eventType: "packet-copy.created",
      chainKey: `packet-copy:${copyId}`,
      payload: {
        roleName,
        signerName: identity.name,
        signerEmail: identity.email,
      },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ copyId, shared: false });
  } catch (error) {
    console.error("Public packet copy create error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create signer copy",
      },
      { status: 400 },
    );
  }
}
