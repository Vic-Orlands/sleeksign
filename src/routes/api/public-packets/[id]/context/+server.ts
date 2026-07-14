import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { bulkSendJobs, bulkSendRows, signingPacketCopies, signingPacketValues } from "@/db/schema";
import {
  areRoleFieldsComplete,
  completePacket,
  completePacketCopy,
  getMergedValuesForSigner,
  getPacket,
  getStorageScopeForRole,
  getVisibleFieldsForSigner,
  upsertPacketValue,
} from "@/lib/signing-workflows";
import { finalizeSigningPacket, finalizeSigningPacketCopy } from "@/lib/pdf-engine";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { getOtpRecipientEmail, isOtpVerified } from "@/lib/signer-otp";
import { getOrganizationBranding } from "@/lib/branding";

export const GET: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const roleName = new URL(req.url).searchParams.get("role") || "";
    const copyId = new URL(req.url).searchParams.get("copyId") || "";

    const packet = await getPacket(id);
    const visibleFields = getVisibleFieldsForSigner({
      fields: packet.document.fields,
      roleConfigs: packet.roleConfigs,
      mode: packet.mode,
      currentRole: roleName,
    });

    const copyValues = copyId
      ? await db.query.signingPacketValues.findMany({
          where: eq(signingPacketValues.copyId, copyId),
        })
      : [];

    const values = getMergedValuesForSigner({
      packetValues: packet.values,
      copyValues,
      fields: visibleFields,
      roleConfigs: packet.roleConfigs,
      mode: packet.mode,
    });

    const copy = copyId
      ? await db.query.signingPacketCopies.findFirst({
          where: eq(signingPacketCopies.id, copyId),
        })
      : null;
    const branding = await getOrganizationBranding(packet.workspaceId);

    if (packet.requireOtp) {
      const verified = await isOtpVerified({
        packetId: packet.id,
        copyId: copyId || null,
        roleName,
      });

      if (!verified) {
        return Response.json(
          {
            error: "Verification required",
            verificationRequired: true,
            recipientEmail:
              copy?.signerEmail ||
              (await getOtpRecipientEmail({
                packetId: packet.id,
                copyId: copyId || null,
              })),
          },
          { status: 403 },
        );
      }
    }

    await emitAuditEvent({
      organizationId: packet.workspaceId,
      teamId: packet.teamId,
      workspaceId: packet.workspaceId,
      documentId: packet.document.id,
      packetId: packet.id,
      packetCopyId: copyId || null,
      actorType: "signer",
      actorEmail: copy?.signerEmail || null,
      eventType: "signer.viewed",
      chainKey: copyId ? `packet-copy:${copyId}` : `packet:${packet.id}`,
      payload: { roleName },
      ...getRequestAuditContext(req.headers),
    });

    if (copyId) {
      const row = await db.query.bulkSendRows.findFirst({
        where: eq(bulkSendRows.packetCopyId, copyId),
      });
      if (row && row.status !== "signed" && row.status !== "viewed") {
        await db
          .update(bulkSendRows)
          .set({ status: "viewed", updatedAt: new Date() })
          .where(eq(bulkSendRows.id, row.id));
      }
      if (row) {
        const viewCount = await db.query.bulkSendRows.findMany({
          where: eq(bulkSendRows.jobId, row.jobId),
        });
        await db
          .update(bulkSendJobs)
          .set({
            viewedCount: viewCount.filter((entry) => entry.status === "viewed" || entry.status === "signed").length,
            updatedAt: new Date(),
          })
          .where(eq(bulkSendJobs.id, row.jobId));
      }
    }

    return Response.json(
      {
        packetId: packet.id,
        mode: packet.mode,
        status: packet.status,
        requireOtp: packet.requireOtp,
        roleName,
        copyId: copyId || null,
        signerName: copy?.signerName || null,
        signerEmail: copy?.signerEmail || null,
        branding,
        document: {
          ...packet.document,
          fileUrl: `/api/public-packets/${packet.id}/file?role=${encodeURIComponent(roleName)}${copyId ? `&copyId=${encodeURIComponent(copyId)}` : ""}`,
        },
        fields: visibleFields,
        values,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Public packet context error:", error);
    return Response.json(
      { error: "Failed to load signing context" },
      { status: 500 },
    );
  }
}

export const PATCH: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const {
      fieldId,
      roleName,
      copyId,
      value,
      signerName,
      signerEmail,
    }: {
      fieldId?: string;
      roleName?: string;
      copyId?: string | null;
      value?: string;
      signerName?: string;
      signerEmail?: string;
    } = await req.json();

    if (!fieldId || !roleName || typeof value !== "string") {
      return Response.json(
        { error: "fieldId, roleName, and value are required" },
        { status: 400 },
      );
    }

    const packet = await getPacket(id);
    if (
      packet.requireOtp &&
      !(await isOtpVerified({
        packetId: packet.id,
        copyId: copyId || null,
        roleName,
      }))
    ) {
      return Response.json(
        { error: "Verification required" },
        { status: 403 },
      );
    }

    const targetField = packet.document.fields.find((field) => field.id === fieldId);
    if (!targetField || targetField.assigneeRole !== roleName) {
      return Response.json(
        { error: "You can only fill fields assigned to your role" },
        { status: 403 },
      );
    }

    const scope = getStorageScopeForRole(packet.roleConfigs, roleName, packet.mode);

    await upsertPacketValue({
      packetId: packet.id,
      copyId: scope === "shared" ? null : copyId || null,
      fieldId,
      roleName,
      value,
      signerName,
      signerEmail,
    });

    await emitAuditEvent({
      organizationId: packet.workspaceId,
      teamId: packet.teamId,
      workspaceId: packet.workspaceId,
      documentId: packet.document.id,
      packetId: packet.id,
      packetCopyId: scope === "shared" ? null : copyId || null,
      actorType: "signer",
      actorEmail: signerEmail || null,
      eventType: "field.completed",
      chainKey:
        scope === "shared"
          ? `packet:${packet.id}`
          : `packet-copy:${copyId || ""}`,
      payload: { fieldId, roleName },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Public packet save error:", error);
    return Response.json(
      { error: "Failed to save field" },
      { status: 500 },
    );
  }
}

export const POST: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const {
      roleName,
      copyId,
      signerName,
      signerEmail,
    }: {
      roleName?: string;
      copyId?: string | null;
      signerName?: string;
      signerEmail?: string;
    } = await req.json();

    if (!roleName) {
      return Response.json(
        { error: "Role name is required" },
        { status: 400 },
      );
    }

    const packet = await getPacket(id);
    if (
      packet.requireOtp &&
      !(await isOtpVerified({
        packetId: packet.id,
        copyId: copyId || null,
        roleName,
      }))
    ) {
      return Response.json(
        { error: "Verification required" },
        { status: 403 },
      );
    }
    const visibleFields = getVisibleFieldsForSigner({
      fields: packet.document.fields,
      roleConfigs: packet.roleConfigs,
      mode: packet.mode,
      currentRole: roleName,
    });
    const scope = getStorageScopeForRole(packet.roleConfigs, roleName, packet.mode);
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
        return Response.json({ status: "completed", url: finalizedPacket.url });
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

    await completePacketCopy(copyId, finalizedCopy.url, finalizedCopy.storageKey);
    const row = await db.query.bulkSendRows.findFirst({
      where: eq(bulkSendRows.packetCopyId, copyId),
    });
    if (row) {
      await db
        .update(bulkSendRows)
        .set({
          status: "signed",
          updatedAt: new Date(),
        })
        .where(eq(bulkSendRows.id, row.id));

      const jobRows = await db.query.bulkSendRows.findMany({
        where: eq(bulkSendRows.jobId, row.jobId),
      });
      await db
        .update(bulkSendJobs)
        .set({
          signedCount: jobRows.filter((entry) => entry.status === "signed").length,
          updatedAt: new Date(),
        })
        .where(eq(bulkSendJobs.id, row.jobId));
    }

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
  } catch (error) {
    console.error("Public packet completion error:", error);
    return Response.json(
      { error: "Failed to complete signing" },
      { status: 500 },
    );
  }
}
