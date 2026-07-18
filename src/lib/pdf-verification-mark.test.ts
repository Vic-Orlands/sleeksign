import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { stampVerificationMarks } from "@/lib/pdf-verification-mark";

describe("stampVerificationMarks", () => {
  it("marks every existing page without adding a certificate page", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([612, 792]);
    pdf.addPage([595, 842]);

    await stampVerificationMarks(
      pdf,
      "https://app.sleeksign.test/verify/ss_123456789012345678901234",
    );

    const bytes = await pdf.save({ useObjectStreams: false });
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(2);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
  });
});
