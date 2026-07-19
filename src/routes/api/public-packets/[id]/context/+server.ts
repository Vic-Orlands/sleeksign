import type { RequestHandler } from "./$types";
import { and, eq, isNull } from "drizzle-orm";

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
import {
  establishSignerIdentity,
  resolvePacketSignerIdentity,
} from "@/lib/signer-identity";

function getPublicDownloadUrl(
  packetId: string,
  roleName: string,
  copyId?: string | null,
) {
  const params = new URLSearchParams({ role: roleName, download: "1" });
  if (copyId) params.set("copyId", copyId);
  return `/api/public-packets/${packetId}/download?${params.toString()}`;
}

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
    if (
      copyId &&
      (!copy || copy.packetId !== packet.id || copy.roleName !== roleName)
    ) {
      return Response.json({ error: "Signing invitation not found" }, { status: 404 });
    }
    const scope = roleName
      ? getStorageScopeForRole(packet.roleConfigs, roleName, packet.mode)
      : "shared";
    const roleValues = (scope === "private" ? copyValues : packet.values).filter(
      (value) => value.roleName === roleName,
    );
    const roleCompleted =
      packet.status === "completed" ||
      (scope === "private"
        ? copy?.status === "completed"
        : roleValues.some((value) => Boolean(value.completedAt)));
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
            signerName: copy?.signerName || "",
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

    const identity = await resolvePacketSignerIdentity({
      packetId: packet.id,
      copyId: copyId || null,
      roleName,
      requestHeaders: req.headers,
    });
    if (!identity) {
      return Response.json(
        {
          error: "Signer identity required",
          identityRequired: true,
        },
        { status: 428 },
      );
    }

    await emitAuditEvent({
      organizationId: packet.workspaceId,
      teamId: packet.teamId,
      workspaceId: packet.workspaceId,
      documentId: packet.document.id,
      packetId: packet.id,
      packetCopyId: copyId || null,
      actorType: "signer",
      actorEmail: identity.email,
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
        roleCompleted,
        completedUrl:
          copy?.status === "completed" || packet.status === "completed"
            ? getPublicDownloadUrl(packet.id, roleName, copyId || null)
            : null,
        requireOtp: packet.requireOtp,
        roleName,
        copyId: copyId || null,
        signerName: identity.name,
        signerEmail: identity.email,
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

export const PUT: RequestHandler = async ({ request: req, params }) => {
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
      return Response.json({ error: "Role name is required" }, { status: 400 });
    }

    const identity = await establishSignerIdentity({
      packetId: id,
      copyId: copyId || null,
      roleName,
      name: signerName || "",
      email: signerEmail || "",
      requestHeaders: req.headers,
    });

    return Response.json({ identity });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to confirm signer identity",
      },
      { status: 400 },
    );
  }
};

export const PATCH: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const {
      fieldId,
      roleName,
      copyId,
      value,
    }: {
      fieldId?: string;
      roleName?: string;
      copyId?: string | null;
      value?: string;
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
    const identity = await resolvePacketSignerIdentity({
      packetId: packet.id,
      copyId: copyId || null,
      roleName,
      requestHeaders: req.headers,
    });
    if (!identity) {
      return Response.json(
        { error: "Full name and email address are required" },
        { status: 428 },
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
      signerName: identity.name,
      signerEmail: identity.email,
    });

    await emitAuditEvent({
      organizationId: packet.workspaceId,
      teamId: packet.teamId,
      workspaceId: packet.workspaceId,
      documentId: packet.document.id,
      packetId: packet.id,
      packetCopyId: scope === "shared" ? null : copyId || null,
      actorType: "signer",
      actorEmail: identity.email,
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
      values,
    }: {
      roleName?: string;
      copyId?: string | null;
      values?: Record<string, string>;
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
    const identity = await resolvePacketSignerIdentity({
      packetId: packet.id,
      copyId: copyId || null,
      roleName,
      requestHeaders: req.headers,
    });
    if (!identity) {
      return Response.json(
        { error: "Full name and email address are required" },
        { status: 428 },
      );
    }
    const visibleFields = getVisibleFieldsForSigner({
      fields: packet.document.fields,
      roleConfigs: packet.roleConfigs,
      mode: packet.mode,
      currentRole: roleName,
    });
    const scope = getStorageScopeForRole(packet.roleConfigs, roleName, packet.mode);
    const copy = copyId
      ? await db.query.signingPacketCopies.findFirst({
          where: eq(signingPacketCopies.id, copyId),
        })
      : null;

    if (packet.status === "completed") {
      return Response.json({
        status: "completed",
        url: getPublicDownloadUrl(packet.id, roleName, copyId || null),
      });
    }

    if (copy?.status === "completed") {
      return Response.json({
        status: "completed",
        url: getPublicDownloadUrl(packet.id, roleName, copyId || null),
      });
    }

    const submittedValues = Object.entries(values || {}).filter(
      ([, value]) => typeof value === "string" && value.length > 0,
    );
    for (const [fieldId, value] of submittedValues) {
      const targetField = packet.document.fields.find((field) => field.id === fieldId);
      if (!targetField || targetField.assigneeRole !== roleName) {
        return Response.json(
          { error: "You can only fill fields assigned to your role" },
          { status: 403 },
        );
      }

      await upsertPacketValue({
        packetId: packet.id,
        copyId: scope === "shared" ? null : copyId || null,
        fieldId,
        roleName,
        value,
        signerName: identity.name,
        signerEmail: identity.email,
      });
    }

    const refreshedPacket = await getPacket(id);
    const currentValues = getMergedValuesForSigner({
      packetValues: refreshedPacket.values,
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

    await db
      .update(signingPacketValues)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(signingPacketValues.packetId, packet.id),
          eq(signingPacketValues.roleName, roleName),
          scope === "shared"
            ? isNull(signingPacketValues.copyId)
            : eq(signingPacketValues.copyId, copyId || ""),
        ),
      );

    if (scope === "shared") {
      const finalizedPacket = await finalizeSigningPacket({
        packetId: packet.id,
        roleName,
        signerName: identity.name,
        signerEmail: identity.email,
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
          actorEmail: identity.email,
          eventType: "packet.finalized",
          chainKey: `packet:${packet.id}`,
          payload: { roleName, storageProvider: "r2" },
          ...getRequestAuditContext(req.headers),
        });
        return Response.json({
          status: "completed",
          url: getPublicDownloadUrl(packet.id, roleName),
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
      signerName: identity.name,
      signerEmail: identity.email,
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
      actorEmail: identity.email,
      eventType: "packet-copy.finalized",
      chainKey: `packet-copy:${copyId}`,
      payload: { roleName, storageProvider: "r2" },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({
      status: "completed",
      url: getPublicDownloadUrl(packet.id, roleName, copyId),
    });
  } catch (error) {
    console.error("Public packet completion error:", error);
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("x-vercel-oidc-token") ||
      message.includes("Could not load the default credentials")
    ) {
      return Response.json(
        {
          error:
            "Document security service is unavailable in this local environment. Use a linked Vercel runtime or configure Google Application Default Credentials.",
        },
        { status: 503 },
      );
    }
    return Response.json(
      { error: "Failed to complete signing" },
      { status: 500 },
    );
  }
}
