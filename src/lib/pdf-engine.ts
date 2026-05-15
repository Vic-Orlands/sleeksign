import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/db";
import { documents, fields, signatures, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

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

  for (const field of docFields) {
    const signature = sessionSignatures.find((s) => s.fieldId === field.id);
    if (!signature) continue;

    const page = pdfDoc.getPage(field.page);
    const { width, height } = page.getSize();

    // The web UI (react-pdf-viewer) and pdf-lib have different coordinate origins
    // pdf-lib: (0,0) is Bottom-Left
    // web UI: (0,0) is Top-Left

    const x = field.x;
    const y = height - field.y - field.height;

    if (field.type === "signature") {
      if (signature.value.startsWith("data:image")) {
        const imageBytes = Buffer.from(signature.value.split(",")[1], "base64");
        const image = signature.value.includes("image/png")
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

        page.drawImage(image, {
          x,
          y,
          width: field.width,
          height: field.height,
        });
      } else {
        const helveticaFont = await pdfDoc.embedFont(
          StandardFonts.HelveticaBold,
        );
        page.drawText(
          signature.value.length > 20 ? "Signed" : signature.value,
          {
            x: x + 5,
            y: y + 15,
            size: 20,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          },
        );
      }
    } else if (field.type === "text") {
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(signature.value, {
        x: x + 5,
        y: y + 15,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }
  }

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

  await db
    .update(sessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  return `/uploads/${finalizedFileName}`;
}
