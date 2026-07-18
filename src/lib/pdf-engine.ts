import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  documents,
  fields,
  signatures,
  signingPacketCopies,
  signingPacketValues,
  sessions,
} from "@/db/schema";
import { emitAuditEvent, getAuditChainSnapshot } from "@/lib/audit";
import {
  createDocumentVerificationId,
  findArtifactVerification,
  getVerificationUrl,
  sealDocument,
} from "@/lib/document-verification";
import { decodeSignatureVector } from "@/lib/field-utils";
import { stampVerificationMarks } from "@/lib/pdf-verification-mark";
import { buildFinalizedKey, getObjectBytes } from "@/lib/r2-storage";
import {
  areRoleFieldsComplete,
  getMergedValuesForSigner,
  getPacket,
} from "@/lib/signing-workflows";

type FinalizedDocumentResult = {
  url: string;
  storageKey: string;
  verificationId: string;
};

async function renderFinalizedDocument(input: {
  sourceStorageKey: string;
  fields: Array<typeof fields.$inferSelect>;
  values: Record<string, string>;
  verificationId: string;
}) {
  const sourceBytes = await getObjectBytes(input.sourceStorageKey);
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const typedSignatureFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const field of input.fields) {
    const value = input.values[field.id];
    if (!value) continue;

    const page = pdfDoc.getPage(field.page);
    const { width: pageWidth, height: pageHeight } = page.getSize();
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
        const encoded = value.split(",")[1];
        if (!encoded) throw new Error("Signature image is malformed");
        const imageBytes = Buffer.from(encoded, "base64");
        const image = value.includes("image/png")
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);
        page.drawImage(image, { x, y, width, height });
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
      page.drawText(value, {
        x: x + 2,
        y: y + height / 3,
        size: Math.min(height * 0.8, 11),
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    } else if (field.type === "checkbox") {
      if (value === "true") {
        page.drawText("X", {
          x: x + width / 2 - 4,
          y: y + height / 2 - 4,
          size: Math.min(width, height) * 0.7,
          font: boldFont,
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

  await stampVerificationMarks(pdfDoc, getVerificationUrl(input.verificationId));

  return {
    sourceBytes,
    finalizedBytes: await pdfDoc.save({ useObjectStreams: false }),
  };
}

async function renderAndSeal(input: {
  organizationId: string;
  teamId?: string | null;
  documentId: string;
  artifactType: "session" | "packet" | "copy";
  artifactId: string;
  sourceStorageKey: string;
  finalizedStorageKey: string;
  finalizedFileName: string;
  fields: Array<typeof fields.$inferSelect>;
  values: Record<string, string>;
  auditChainKey: string;
  actorName?: string | null;
  actorEmail?: string | null;
  roleName?: string | null;
}) {
  const existing = await findArtifactVerification(input.artifactType, input.artifactId);
  if (existing) return existing;

  const verificationId = createDocumentVerificationId();
  const finalizedAt = new Date();
  await emitAuditEvent({
    organizationId: input.organizationId,
    teamId: input.teamId || null,
    workspaceId: input.organizationId,
    documentId: input.documentId,
    packetId: input.artifactType === "packet" ? input.artifactId : null,
    packetCopyId: input.artifactType === "copy" ? input.artifactId : null,
    sessionId: input.artifactType === "session" ? input.artifactId : null,
    actorType: "signer",
    actorEmail: input.actorEmail || null,
    eventType: "document.sealing",
    chainKey: input.auditChainKey,
    payload: {
      artifactType: input.artifactType,
      verificationId,
      roleName: input.roleName || null,
      actorName: input.actorName || null,
    },
  });
  const audit = await getAuditChainSnapshot(input.organizationId, input.auditChainKey);
  const rendered = await renderFinalizedDocument({
    sourceStorageKey: input.sourceStorageKey,
    fields: input.fields,
    values: input.values,
    verificationId,
  });
  return sealDocument({
    verificationId,
    organizationId: input.organizationId,
    teamId: input.teamId,
    documentId: input.documentId,
    artifactType: input.artifactType,
    artifactId: input.artifactId,
    sourceBytes: rendered.sourceBytes,
    finalizedBytes: rendered.finalizedBytes,
    finalizedStorageKey: input.finalizedStorageKey,
    finalizedFileName: input.finalizedFileName,
    auditChainKey: input.auditChainKey,
    auditEventCount: audit.eventCount,
    auditRootHash: audit.rootHash,
    finalizedAt,
  });
}

export async function finalizeDocument(sessionId: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { document: true },
  });
  if (!session?.documentId) throw new Error("Session not found");
  if (session.status === "completed" && session.finalizedFileUrl) {
    return session.finalizedFileUrl;
  }

  const docData = await db.query.documents.findFirst({
    where: eq(documents.id, session.documentId),
  });
  if (!docData?.workspaceId || !docData.storageKey) {
    throw new Error("Document storage not configured");
  }

  const [docFields, sessionSignatures] = await Promise.all([
    db.query.fields.findMany({ where: eq(fields.documentId, session.documentId) }),
    db.query.signatures.findMany({ where: eq(signatures.sessionId, sessionId) }),
  ]);
  const finalizedStorageKey = buildFinalizedKey(
    docData.workspaceId,
    docData.id,
    "session",
    session.id,
  );
  const receipt = await renderAndSeal({
    organizationId: docData.workspaceId,
    teamId: session.teamId,
    documentId: docData.id,
    artifactType: "session",
    artifactId: session.id,
    sourceStorageKey: docData.storageKey,
    finalizedStorageKey,
    finalizedFileName: `finalized_${session.id}.pdf`,
    fields: docFields,
    values: Object.fromEntries(
      sessionSignatures.map((signature) => [signature.fieldId, signature.value]),
    ),
    auditChainKey: `session:${session.id}`,
    actorName: session.signerName,
    actorEmail: session.signerEmail,
    roleName: session.signerRole,
  });

  const finalizedFileUrl = `/api/finalized/session/${session.id}`;
  await db
    .update(sessions)
    .set({
      status: "completed",
      completedAt: new Date(),
      finalizedFileUrl,
      finalizedStorageKey: receipt.finalizedStorageKey,
    })
    .where(eq(sessions.id, sessionId));
  return finalizedFileUrl;
}

export async function finalizeSigningPacket(input: {
  packetId: string;
  roleName: string;
  signerName?: string | null;
  signerEmail?: string | null;
}) {
  const packet = await getPacket(input.packetId);
  if (packet.mode !== "collaborative") return null;

  const packetValues = Object.fromEntries(
    packet.values.map((value) => [value.fieldId, value.value]),
  );
  const allRolesComplete = packet.roleConfigs.every((role) =>
    areRoleFieldsComplete(packet.document.fields, role.name, packetValues),
  );
  if (!allRolesComplete) return null;
  if (!packet.document.workspaceId || !packet.document.storageKey) {
    throw new Error("Document storage not configured");
  }

  const storageKey = buildFinalizedKey(
    packet.document.workspaceId,
    packet.document.id,
    "packet",
    packet.id,
  );
  const receipt = await renderAndSeal({
    organizationId: packet.document.workspaceId,
    teamId: packet.teamId,
    documentId: packet.document.id,
    artifactType: "packet",
    artifactId: packet.id,
    sourceStorageKey: packet.document.storageKey,
    finalizedStorageKey: storageKey,
    finalizedFileName: `packet_${packet.id}.pdf`,
    fields: packet.document.fields,
    values: packetValues,
    auditChainKey: `packet:${packet.id}`,
    actorName: input.signerName,
    actorEmail: input.signerEmail,
    roleName: input.roleName,
  });
  return {
    url: `/api/finalized/packet/${packet.id}`,
    storageKey: receipt.finalizedStorageKey,
    verificationId: receipt.id,
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
  if (!copy) throw new Error("Copy not found");

  const copyValues = await db.query.signingPacketValues.findMany({
    where: eq(signingPacketValues.copyId, input.copyId),
  });
  const visibleFields = packet.document.fields.filter((field) => {
    if (packet.mode === "individual") return field.assigneeRole === input.roleName;
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
  const receipt = await renderAndSeal({
    organizationId: packet.document.workspaceId,
    teamId: copy.teamId || packet.teamId,
    documentId: packet.document.id,
    artifactType: "copy",
    artifactId: copy.id,
    sourceStorageKey: packet.document.storageKey,
    finalizedStorageKey: storageKey,
    finalizedFileName: `copy_${copy.id}.pdf`,
    fields: visibleFields,
    values,
    auditChainKey: `packet-copy:${copy.id}`,
    actorName: input.signerName || copy.signerName,
    actorEmail: input.signerEmail || copy.signerEmail,
    roleName: input.roleName,
  });
  return {
    url: `/api/finalized/copy/${copy.id}`,
    storageKey: receipt.finalizedStorageKey,
    verificationId: receipt.id,
  } satisfies FinalizedDocumentResult;
}

export type { FinalizedDocumentResult };
