import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function stampVerificationMarks(
  pdfDoc: PDFDocument,
  verificationUrl: string,
) {
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    const { width } = page.getSize();
    const label = `SleekSign | ${index + 1}/${pages.length} | Verify: ${verificationUrl}`;
    const availableWidth = Math.max(width - 24, 120);
    const baseSize = 6;
    const labelWidth = regularFont.widthOfTextAtSize(label, baseSize);
    const size = Math.max(4.5, Math.min(baseSize, (availableWidth / labelWidth) * baseSize));
    const renderedWidth = regularFont.widthOfTextAtSize(label, size);
    page.drawRectangle({
      x: Math.max(8, width - renderedWidth - 12),
      y: 5,
      width: renderedWidth + 5,
      height: size + 3,
      color: rgb(1, 1, 1),
      opacity: 0.58,
    });
    page.drawText(label, {
      x: Math.max(10, width - renderedWidth - 10),
      y: 7,
      size,
      font: regularFont,
      color: rgb(0.32, 0.32, 0.35),
      opacity: 0.72,
    });
  });
}
