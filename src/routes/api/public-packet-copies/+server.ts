import type { RequestHandler } from "./$types";

import { createPacketCopy, getPacket } from "@/lib/signing-workflows";
import { getStorageScopeForRole } from "@/lib/signing-workflows";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";

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

    const packet = await getPacket(packetId);
    const scope = getStorageScopeForRole(packet.roleConfigs, roleName, packet.mode);

    if (scope === "shared") {
      return Response.json({ copyId: null, shared: true });
    }

    const copyId = await createPacketCopy({
      packetId,
      roleName,
      signerName,
      signerEmail,
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
      actorEmail: signerEmail || null,
      eventType: "packet-copy.created",
      chainKey: `packet-copy:${copyId}`,
      payload: {
        roleName,
        signerName: signerName || null,
        signerEmail: signerEmail || null,
      },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ copyId, shared: false });
  } catch (error) {
    console.error("Public packet copy create error:", error);
    return Response.json(
      { error: "Failed to create signer copy" },
      { status: 500 },
    );
  }
}
