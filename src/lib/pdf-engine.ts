import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/db";
import {
  documents,
  fields,
  signatures,
  signingPacketCopies,
  signingPacketValues,
  sessions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";
import {
  areRoleFieldsComplete,
  getMergedValuesForSigner,
  getPacket,
} from "@/lib/signing-workflows";
import { decodeSignatureVector } from "@/lib/field-utils";

export async function finalizeDocument(sessionId: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      document: true,
    },
  });

  if (!session || !session.documentId) throw new Error("Session not found");

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

  const finalizedPath = await renderFinalizedDocument({
    fileUrl: docData.fileUrl,
    fileNameSeed: session.id,
    fields: docFields,
    values: Object.fromEntries(
      sessionSignatures.map((signature) => [signature.fieldId, signature.value]),
    ),
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
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  return finalizedPath;
}

async function renderFinalizedDocument(input: {
  fileUrl: string;
  fileNameSeed: string;
  fields: Array<typeof fields.$inferSelect>;
  values: Record<string, string>;
  certificateDetails: Array<{ label: string; value: string }>;
}) {
  const pdfBytes = await fs.readFile(
    path.join(process.cwd(), "public", input.fileUrl),
  );
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const fallbackSignatureFont = await pdfDoc.embedFont(
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
          font: fallbackSignatureFont,
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
  const finalizedFileName = `finalized_${input.fileNameSeed}.pdf`;
  const finalizedPath = path.join(
    process.cwd(),
    "public",
    "uploads",
    finalizedFileName,
  );

  await fs.mkdir(path.dirname(finalizedPath), { recursive: true });
  await fs.writeFile(finalizedPath, finalizedPdfBytes);

  return `/uploads/${finalizedFileName}`;
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

  return renderFinalizedDocument({
    fileUrl: packet.document.fileUrl,
    fileNameSeed: `packet_${packet.id}`,
    fields: packet.document.fields,
    values: packetValues,
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

  return renderFinalizedDocument({
    fileUrl: packet.document.fileUrl,
    fileNameSeed: `copy_${copy.id}`,
    fields: visibleFields,
    values,
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
}
