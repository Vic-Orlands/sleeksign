import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documentVerifications } from "@/db/schema";
import { verifyDocumentReceipt } from "@/lib/document-verification";
import type { Actions, PageServerLoad } from "./$types";

const MAX_PDF_BYTES = 25 * 1024 * 1024;

function validVerificationId(value: string) {
  return /^ss_[A-Za-z0-9_-]{24}$/.test(value);
}

export const load: PageServerLoad = async ({ params }) => {
  if (!validVerificationId(params.id)) return { found: false, verificationId: params.id };
  const receipt = await db.query.documentVerifications.findFirst({
    where: eq(documentVerifications.id, params.id),
  });
  return {
    found: Boolean(receipt),
    verificationId: params.id,
    status: receipt?.status || null,
    finalizedAt: receipt?.finalizedAt || null,
  };
};

export const actions: Actions = {
  default: async ({ request, params }) => {
    if (!validVerificationId(params.id)) {
      return fail(404, { result: "not_found" as const });
    }
    const form = await request.formData();
    const document = form.get("document");
    if (!(document instanceof File) || document.size === 0) {
      return fail(400, { result: "missing_file" as const });
    }
    if (document.size > MAX_PDF_BYTES) {
      return fail(413, { result: "file_too_large" as const });
    }

    const bytes = new Uint8Array(await document.arrayBuffer());
    const magic = new TextDecoder().decode(bytes.slice(0, 5));
    if (magic !== "%PDF-") {
      return fail(400, { result: "invalid_pdf" as const });
    }

    try {
      const verification = await verifyDocumentReceipt(params.id, bytes);
      if (!verification.valid) {
        return fail(400, { result: verification.reason });
      }
      return {
        result: "valid" as const,
        documentName: verification.document.name,
        finalizedAt: verification.receipt.finalizedAt.toISOString(),
        auditEventCount: verification.receipt.auditEventCount,
        signatureAlgorithm: verification.receipt.signatureAlgorithm,
        keyFingerprint: verification.receipt.publicKeyFingerprint.slice(0, 16),
      };
    } catch (error) {
      console.error("Public document verification failed:", error);
      return fail(503, { result: "unavailable" as const });
    }
  },
};
