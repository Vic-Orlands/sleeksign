import type { RequestHandler } from "./$types";
import {
  finalizeDocument,
  finalizeSigningPacket,
  finalizeSigningPacketCopy,
} from "@/lib/pdf-engine";
import {
  areRoleFieldsComplete,
  completePacket,
  completePacketCopy,
  getMergedValuesForSigner,
  getPacket,
  getStorageScopeForRole,
  getVisibleFieldsForSigner,
} from "@/lib/signing-workflows";
import { db } from "@/db";
import { signingPacketValues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const body = await req.json();
    const {
      sessionId,
      packetId,
      roleName,
      copyId,
      signerName,
      signerEmail,
    }: {
      sessionId?: string;
      packetId?: string;
      roleName?: string;
      copyId?: string | null;
      signerName?: string | null;
      signerEmail?: string | null;
    } = body;

    if (packetId) {
      if (!roleName) {
        return Response.json(
          { error: "Role name is required" },
          { status: 400 },
        );
      }

      const packet = await getPacket(packetId);
      const visibleFields = getVisibleFieldsForSigner({
        fields: packet.document.fields,
        roleConfigs: packet.roleConfigs,
        mode: packet.mode,
        currentRole: roleName,
      });
      const scope = getStorageScopeForRole(
        packet.roleConfigs,
        roleName,
        packet.mode,
      );
      const currentValues = getMergedValuesForSigner({
        packetValues: packet.values,
        copyValues:
          copyId && scope === "private"
            ? await db.query.signingPacketValues.findMany({
                where: eq(signingPacketValues.copyId, copyId),
              })
            : [],
        fields: visibleFields,
        roleConfigs: packet.roleConfigs,
        mode: packet.mode,
      });

      if (!areRoleFieldsComplete(visibleFields, roleName, currentValues)) {
        return Response.json(
          { error: "Complete all required fields assigned to this role first" },
          { status: 400 },
        );
      }

      if (scope === "shared") {
        const finalizedPacket = await finalizeSigningPacket({
          packetId: packet.id,
          roleName,
          signerName: signerName || null,
          signerEmail: signerEmail || null,
        });

        if (finalizedPacket) {
          await completePacket(
            packet.id,
            finalizedPacket.url,
            finalizedPacket.storageKey,
          );
          await emitAuditEvent({
            organizationId: packet.workspaceId,
            teamId: packet.teamId,
            workspaceId: packet.workspaceId,
            documentId: packet.document.id,
            packetId: packet.id,
            actorType: "signer",
            actorEmail: signerEmail || null,
            eventType: "packet.finalized",
            chainKey: `packet:${packet.id}`,
            payload: { roleName, storageProvider: "r2" },
            ...getRequestAuditContext(req.headers),
          });
          return Response.json({
            status: "completed",
            url: finalizedPacket.url,
          });
        }

        return Response.json({
          status: "waiting",
          message: "Your part is complete. Waiting for the remaining parties.",
        });
      }

      if (!copyId) {
        return Response.json(
          { error: "Copy ID required for recipient-specific signing" },
          { status: 400 },
        );
      }

      const finalizedCopy = await finalizeSigningPacketCopy({
        packetId: packet.id,
        copyId,
        roleName,
        signerName: signerName || null,
        signerEmail: signerEmail || null,
      });

      await completePacketCopy(
        copyId,
        finalizedCopy.url,
        finalizedCopy.storageKey,
      );
      await emitAuditEvent({
        organizationId: packet.workspaceId,
        teamId: packet.teamId,
        workspaceId: packet.workspaceId,
        documentId: packet.document.id,
        packetId: packet.id,
        packetCopyId: copyId,
        actorType: "signer",
        actorEmail: signerEmail || null,
        eventType: "packet-copy.finalized",
        chainKey: `packet-copy:${copyId}`,
        payload: { roleName, storageProvider: "r2" },
        ...getRequestAuditContext(req.headers),
      });

      return Response.json({ status: "completed", url: finalizedCopy.url });
    }

    if (!sessionId) {
      return Response.json(
        { error: "sessionId or packetId is required" },
        { status: 400 },
      );
    }

    const finalUrl = await finalizeDocument(sessionId);

    fetch(`${new URL(req.url).origin}/api/notifications`, {
      method: "POST",
      body: JSON.stringify({ sessionId, type: "COMPLETED" }),
    }).catch(console.error);

    return Response.json({ url: finalUrl, status: "completed" });
  } catch (error) {
    console.error("Finalization error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to finalize document",
      },
      { status: 500 },
    );
  }
};
