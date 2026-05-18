import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/db";
import { documents, fields, signatures, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";
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

  const pdfBytes = await fs.readFile(
    path.join(process.cwd(), "public", docData.fileUrl),
  );
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const docFields = await db.query.fields.findMany({
    where: eq(fields.documentId, session.documentId),
  });

  const sessionSignatures = await db.query.signatures.findMany({
    where: eq(signatures.sessionId, sessionId),
  });

  const fallbackSignatureFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  for (const field of docFields) {
    const signature = sessionSignatures.find((s) => s.fieldId === field.id);
    if (!signature) continue;

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
      const vector = decodeSignatureVector(signature.value);
      if (vector) {
        const viewBox = vector.viewBox.split(" ").map(Number);
        const [, , svgWidth, svgHeight] = viewBox;
        const scale = Math.min(width / svgWidth, height / svgHeight) || 1;
        page.drawSvgPath(vector.pathData, {
          x: x + (width - svgWidth * scale) / 2 - viewBox[0] * scale,
          y: y + (height - svgHeight * scale) / 2 - viewBox[1] * scale,
          scale,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
      } else if (signature.value.startsWith("data:image")) {
        const imageBytes = Buffer.from(signature.value.split(",")[1], "base64");
        const image = signature.value.includes("image/png")
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

        page.drawImage(image, {
          x,
          y,
          width,
          height,
        });
      } else {
        page.drawText(signature.value, {
          x: x + 5,
          y: y + height / 4,
          size: Math.min(height, 32),
          font: fallbackSignatureFont,
          color: rgb(0, 0, 0),
        });
      }
    } else if (field.type === "text" || field.type === "date") {
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(signature.value, {
        x: x + 2,
        y: y + height / 3,
        size: Math.min(height * 0.8, 11),
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    } else if (field.type === "checkbox") {
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      if (signature.value === "true") {
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

  const details = [
    { label: "Document Name", value: docData.name },
    { label: "Document ID", value: docData.id },
    { label: "Session ID", value: session.id },
    { label: "Signer Name", value: session.signerName || "Anonymous" },
    { label: "Signer Email", value: session.signerEmail || "N/A" },
    { label: "Signer IP", value: session.signerIp || "N/A" },
    { label: "Completed At", value: format(new Date(), "PPpp") },
    { label: "Status", value: "LEGALLY SIGNED" },
  ];

  let currentY = 650;
  details.forEach((item) => {
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
  const finalizedFileName = `finalized_${session.id}.pdf`;
  const finalizedPath = path.join(
    process.cwd(),
    "public",
    "uploads",
    finalizedFileName,
  );

  await fs.mkdir(path.dirname(finalizedPath), { recursive: true });
  await fs.writeFile(finalizedPath, finalizedPdfBytes);

  // CRITICAL: Update status to completed!
  await db
    .update(sessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  return `/uploads/${finalizedFileName}`;
}
