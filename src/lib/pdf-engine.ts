import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/db";
import {
  auditLogs,
  documents,
  fields,
  signatures,
  signingPacketCopies,
  signingPacketValues,
  sessions,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import crypto from "crypto";
import {
  areRoleFieldsComplete,
  getMergedValuesForSigner,
  getPacket,
} from "@/lib/signing-workflows";
import { decodeSignatureVector } from "@/lib/field-utils";
import { parseAuditPayload } from "@/lib/audit";
import {
  buildFinalizedKey,
  getObjectBytes,
  putObjectBytes,
} from "@/lib/r2-storage";

type EvidenceSnapshot = {
  certificateId: string;
  evidenceHash: string;
  eventCount: number;
  timeline: Array<{
    eventType: string;
    actorEmail: string | null;
    createdAt: string;
    ipAddress: string | null;
  }>;
};

type FinalizedDocumentResult = {
  url: string;
  storageKey: string;
};

function createEvidenceHash(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function buildEvidenceSnapshot(chainKey: string) {
  const logs = await db.query.auditLogs.findMany({
    where: eq(auditLogs.chainKey, chainKey),
    orderBy: [asc(auditLogs.createdAt)],
  });

  const timeline = logs.map((log) => ({
    eventType: log.eventType,
    actorEmail: log.actorEmail || null,
    createdAt: log.createdAt.toISOString(),
    ipAddress: log.ipAddress || null,
    payload: parseAuditPayload(log.payload),
  }));

  const certificateId = `cert_${chainKey.replace(/[^a-zA-Z0-9]+/g, "_")}`;
  const evidenceHash = createEvidenceHash({
    chainKey,
    eventHashes: logs.map((log) => log.eventHash),
    timeline,
  });

  return {
    certificateId,
    evidenceHash,
    eventCount: logs.length,
    timeline: timeline.map((entry) => ({
      eventType: entry.eventType,
      actorEmail: entry.actorEmail,
      createdAt: entry.createdAt,
      ipAddress: entry.ipAddress,
    })),
  } satisfies EvidenceSnapshot;
}

export async function finalizeDocument(sessionId: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      document: true,
    },
  });

  if (!session || !session.documentId) throw new Error("Session not found");

  if (session.status === "completed" && session.finalizedFileUrl) {
    return session.finalizedFileUrl;
  }

  const docData = await db.query.documents.findFirst({
    where: eq(documents.id, session.documentId),
  });

  if (!docData) throw new Error("Document not found");

  const docFields = await db.query.fields.findMany({
    where: eq(fields.documentId, session.documentId),
  });

  const sessionSignatures = await db.query.signatures.findMany({
    where: eq(signatures.sessionId, sessionId),
  });

  if (!docData.workspaceId || !docData.storageKey) {
    throw new Error("Document storage not configured");
  }

  const finalizedStorageKey = buildFinalizedKey(
    docData.workspaceId,
    docData.id,
    "session",
    session.id,
  );
  const finalizedFileUrl = `/api/finalized/session/${session.id}`;
  await renderFinalizedDocument({
    sourceStorageKey: docData.storageKey,
    finalizedStorageKey,
    finalizedFileName: `finalized_${session.id}.pdf`,
    fileNameSeed: session.id,
    fields: docFields,
    values: Object.fromEntries(
      sessionSignatures.map((signature) => [signature.fieldId, signature.value]),
    ),
    evidenceSnapshot: await buildEvidenceSnapshot(`session:${session.id}`),
    certificateDetails: [
      { label: "Document Name", value: docData.name },
      { label: "Document ID", value: docData.id },
      { label: "Session ID", value: session.id },
      { label: "Signer Name", value: session.signerName || "Anonymous" },
      { label: "Signer Email", value: session.signerEmail || "N/A" },
      { label: "Signer IP", value: session.signerIp || "N/A" },
      { label: "Completed At", value: format(new Date(), "PPpp") },
      { label: "Status", value: "LEGALLY SIGNED" },
    ],
  });

  await db
    .update(sessions)
    .set({
      status: "completed",
      completedAt: new Date(),
      finalizedFileUrl,
      finalizedStorageKey,
      evidenceSnapshot: JSON.stringify(
        await buildEvidenceSnapshot(`session:${session.id}`),
      ),
      certificateId: `cert_session_${session.id}`,
      certificateHash: createEvidenceHash({
        documentId: docData.id,
        sessionId: session.id,
        finalizedStorageKey,
      }),
    })
    .where(eq(sessions.id, sessionId));

  return finalizedFileUrl;
}

async function renderFinalizedDocument(input: {
  sourceStorageKey: string;
  finalizedStorageKey: string;
  finalizedFileName: string;
  fileNameSeed: string;
  fields: Array<typeof fields.$inferSelect>;
  values: Record<string, string>;
  certificateDetails: Array<{ label: string; value: string }>;
  evidenceSnapshot?: EvidenceSnapshot;
}) {
  const pdfBytes = await getObjectBytes(input.sourceStorageKey);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const typedSignatureFont = await pdfDoc.embedFont(
    StandardFonts.HelveticaOblique,
  );

  for (const field of input.fields) {
    const value = input.values[field.id];
    if (!value) continue;

    const page = pdfDoc.getPage(field.page);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Coordinates are stored as percentages (0-100)
    // Percentage to Points conversion: (percent / 100) * totalPoints
    const x = (field.x / 100) * pageWidth;
    const y =
      pageHeight -
      (field.y / 100) * pageHeight -
      (field.height / 100) * pageHeight;

    const width = (field.width / 100) * pageWidth;
    const height = (field.height / 100) * pageHeight;

    if (field.type === "signature") {
      const vector = decodeSignatureVector(value);
      if (vector) {
        const viewBox = vector.viewBox.split(" ").map(Number);
        const [, , svgWidth, svgHeight] = viewBox;
        const scale = Math.min(width / svgWidth, height / svgHeight) || 1;
        page.drawSvgPath(vector.pathData, {
          x: x + (width - svgWidth * scale) / 2 - viewBox[0] * scale,
          y: y + (height - svgHeight * scale) / 2 - viewBox[1] * scale,
          scale,
          color: rgb(0, 0, 0),
        });
      } else if (value.startsWith("data:image")) {
        const imageBytes = Buffer.from(value.split(",")[1], "base64");
        const image = value.includes("image/png")
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

        page.drawImage(image, {
          x,
          y,
          width,
          height,
        });
      } else {
        page.drawText(value, {
          x: x + 5,
          y: y + height / 4,
          size: Math.min(height, 32),
          font: typedSignatureFont,
          color: rgb(0, 0, 0),
        });
      }
    } else if (field.type === "text" || field.type === "date") {
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(value, {
        x: x + 2,
        y: y + height / 3,
        size: Math.min(height * 0.8, 11),
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    } else if (field.type === "checkbox") {
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      if (value === "true") {
        page.drawText("X", {
          x: x + width / 2 - 4,
          y: y + height / 2 - 4,
          size: Math.min(width, height) * 0.7,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });
    }
  }

  // --- ADD CERTIFICATE OF COMPLETION ---
  const certPage = pdfDoc.addPage([600, 800]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  certPage.drawRectangle({
    x: 0,
    y: 0,
    width: 600,
    height: 800,
    color: rgb(0.98, 0.98, 0.98),
  });

  certPage.drawText("CERTIFICATE OF COMPLETION", {
    x: 50,
    y: 730,
    size: 24,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  certPage.drawText("SleekSign Audit Trail", {
    x: 50,
    y: 705,
    size: 10,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  certPage.drawLine({
    start: { x: 50, y: 690 },
    end: { x: 550, y: 690 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  let currentY = 650;
  input.certificateDetails.forEach((item) => {
    certPage.drawText(item.label, {
      x: 50,
      y: currentY,
      size: 10,
      font: fontBold,
    });
    certPage.drawText(item.value, {
      x: 180,
      y: currentY,
      size: 10,
      font: fontRegular,
    });
    currentY -= 25;
  });

  if (input.evidenceSnapshot) {
    certPage.drawText("Chain of custody", {
      x: 50,
      y: currentY - 10,
      size: 12,
      font: fontBold,
    });

    currentY -= 36;
    certPage.drawText(`Certificate ID: ${input.evidenceSnapshot.certificateId}`, {
      x: 50,
      y: currentY,
      size: 9,
      font: fontRegular,
    });
    currentY -= 16;
    certPage.drawText(`Evidence Hash: ${input.evidenceSnapshot.evidenceHash}`, {
      x: 50,
      y: currentY,
      size: 8,
      font: fontRegular,
      maxWidth: 500,
    });
    currentY -= 20;

    input.evidenceSnapshot.timeline.slice(0, 8).forEach((entry) => {
      certPage.drawText(
        `${entry.createdAt} • ${entry.eventType} • ${entry.actorEmail || "system"} • ${entry.ipAddress || "N/A"}`,
        {
          x: 50,
          y: currentY,
          size: 8,
          font: fontRegular,
          maxWidth: 500,
        },
      );
      currentY -= 14;
    });
  }

  certPage.drawText(
    "This document was electronically signed via SleekSign. The signatures and metadata above provide a secure and verifiable audit trail of the agreement.",
    {
      x: 50,
      y: currentY - 50,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
      maxWidth: 500,
      lineHeight: 14,
    },
  );

  const finalizedPdfBytes = await pdfDoc.save();
  await putObjectBytes(input.finalizedStorageKey, finalizedPdfBytes, {
    contentDisposition: `inline; filename="${input.finalizedFileName}"`,
  });
}

export async function finalizeSigningPacket(input: {
  packetId: string;
  roleName: string;
  signerName?: string | null;
  signerEmail?: string | null;
}) {
  const packet = await getPacket(input.packetId);

  if (packet.mode !== "collaborative") {
    return null;
  }

  const packetValues = Object.fromEntries(
    packet.values.map((value) => [value.fieldId, value.value]),
  );
  const allRolesComplete = packet.roleConfigs.every((role) =>
    areRoleFieldsComplete(packet.document.fields, role.name, packetValues),
  );

  if (!allRolesComplete) {
    return null;
  }

  if (!packet.document.workspaceId || !packet.document.storageKey) {
    throw new Error("Document storage not configured");
  }

  const storageKey = buildFinalizedKey(
    packet.document.workspaceId,
    packet.document.id,
    "packet",
    packet.id,
  );
  await renderFinalizedDocument({
    sourceStorageKey: packet.document.storageKey,
    finalizedStorageKey: storageKey,
    finalizedFileName: `packet_${packet.id}.pdf`,
    fileNameSeed: `packet_${packet.id}`,
    fields: packet.document.fields,
    values: packetValues,
    evidenceSnapshot: await buildEvidenceSnapshot(`packet:${packet.id}`),
    certificateDetails: [
      { label: "Document Name", value: packet.document.name },
      { label: "Document ID", value: packet.document.id },
      { label: "Packet ID", value: packet.id },
      { label: "Workflow Mode", value: "Collaborative Packet" },
      { label: "Completed By", value: input.signerName || input.roleName },
      { label: "Email", value: input.signerEmail || "N/A" },
      { label: "Completed At", value: format(new Date(), "PPpp") },
      { label: "Status", value: "ALL PARTIES COMPLETED" },
    ],
  });
  return {
    url: `/api/finalized/packet/${packet.id}`,
    storageKey,
  } satisfies FinalizedDocumentResult;
}

export async function finalizeSigningPacketCopy(input: {
  packetId: string;
  copyId: string;
  roleName: string;
  signerName?: string | null;
  signerEmail?: string | null;
}) {
  const packet = await getPacket(input.packetId);
  const copy = await db.query.signingPacketCopies.findFirst({
    where: eq(signingPacketCopies.id, input.copyId),
  });

  if (!copy) {
    throw new Error("Copy not found");
  }

  const copyValues = await db.query.signingPacketValues.findMany({
    where: eq(signingPacketValues.copyId, input.copyId),
  });
  const visibleFields = packet.document.fields.filter((field) => {
    if (packet.mode === "individual") {
      return field.assigneeRole === input.roleName;
    }

    const roleScope = packet.roleConfigs.find(
      (role) => role.name === field.assigneeRole,
    )?.scope;

    return roleScope === "shared" || field.assigneeRole === input.roleName;
  });
  const values = getMergedValuesForSigner({
    packetValues: packet.values,
    copyValues,
    fields: visibleFields,
    roleConfigs: packet.roleConfigs,
    mode: packet.mode,
  });

  if (!packet.document.workspaceId || !packet.document.storageKey) {
    throw new Error("Document storage not configured");
  }

  const storageKey = buildFinalizedKey(
    packet.document.workspaceId,
    packet.document.id,
    "copy",
    copy.id,
  );
  await renderFinalizedDocument({
    sourceStorageKey: packet.document.storageKey,
    finalizedStorageKey: storageKey,
    finalizedFileName: `copy_${copy.id}.pdf`,
    fileNameSeed: `copy_${copy.id}`,
    fields: visibleFields,
    values,
    evidenceSnapshot: await buildEvidenceSnapshot(`packet-copy:${copy.id}`),
    certificateDetails: [
      { label: "Document Name", value: packet.document.name },
      { label: "Document ID", value: packet.document.id },
      { label: "Packet ID", value: packet.id },
      { label: "Copy ID", value: copy.id },
      { label: "Role", value: input.roleName },
      { label: "Signer Name", value: input.signerName || copy.signerName || "Anonymous" },
      { label: "Signer Email", value: input.signerEmail || copy.signerEmail || "N/A" },
      { label: "Completed At", value: format(new Date(), "PPpp") },
      {
        label: "Workflow Mode",
        value:
          packet.mode === "individual"
            ? "Individual Copy"
            : "Shared Base Recipient Copy",
      },
    ],
  });
  return {
    url: `/api/finalized/copy/${copy.id}`,
    storageKey,
  } satisfies FinalizedDocumentResult;
}

export type { FinalizedDocumentResult };
