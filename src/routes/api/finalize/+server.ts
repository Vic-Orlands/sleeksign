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
import { sessions, signatures, signingPacketValues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { valueIsComplete } from "@/lib/field-utils";

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
      values,
    }: {
      sessionId?: string;
      packetId?: string;
      roleName?: string;
      copyId?: string | null;
      signerName?: string | null;
      signerEmail?: string | null;
      values?: Record<string, string>;
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

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        document: { with: { fields: true } },
        signatures: true,
      },
    });

    if (!session?.document) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "completed" && session.finalizedFileUrl) {
      return Response.json({ url: session.finalizedFileUrl, status: "completed" });
    }

    const submittedValues = Object.entries(values || {}).filter(
      ([, value]) => typeof value === "string" && value.length > 0,
    );
    for (const [fieldId, value] of submittedValues) {
      const targetField = session.document.fields.find((field) => field.id === fieldId);
      if (
        !targetField ||
        (session.signerRole && targetField.assigneeRole !== session.signerRole)
      ) {
        return Response.json(
          { error: "You can only fill fields assigned to your role" },
          { status: 403 },
        );
      }

      const existing = session.signatures.find((signature) => signature.fieldId === fieldId);
      if (existing) {
        await db
          .update(signatures)
          .set({ value })
          .where(eq(signatures.id, existing.id));
      } else {
        await db.insert(signatures).values({
          id: nanoid(),
          sessionId,
          fieldId,
          value,
        });
      }
    }

    const mergedValues = {
      ...Object.fromEntries(
        session.signatures.map((signature) => [signature.fieldId, signature.value]),
      ),
      ...(values || {}),
    };
    const requiredFields = session.document.fields.filter(
      (field) =>
        field.required &&
        (!session.signerRole || field.assigneeRole === session.signerRole),
    );
    if (!requiredFields.every((field) => valueIsComplete(mergedValues[field.id]))) {
      return Response.json(
        { error: "Complete all required fields first" },
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
