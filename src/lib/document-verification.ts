import crypto from "crypto";
import { and, asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { auditLogs, documentVerifications } from "@/db/schema";
import { verifyAuditChain } from "@/lib/audit";
import { canonicalStringify } from "@/lib/canonical-json";
import {
  signCanonicalManifest,
  verifyCanonicalManifestSignature,
} from "@/lib/google-kms";
import { putObjectBytes } from "@/lib/r2-storage";

type ArtifactType = "session" | "packet" | "copy";

type VerificationManifest = {
  schema: "https://sleeksign.app/schemas/document-verification/v1";
  version: 1;
  verificationId: string;
  workspaceId: string;
  artifact: {
    type: ArtifactType;
    id: string;
  };
  document: {
    id: string;
    sourceSha256: string;
    finalizedSha256: string;
  };
  audit: {
    chainKey: string;
    eventCount: number;
    rootSha256: string;
  };
  finalizedAt: string;
};

function sha256(value: Uint8Array | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashesEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right))
    return false;
  return crypto.timingSafeEqual(
    Buffer.from(left, "hex"),
    Buffer.from(right, "hex"),
  );
}

export function createDocumentVerificationId() {
  return `ss_${nanoid(24)}`;
}

export function getVerificationUrl(verificationId: string) {
  const configuredOrigin = process.env.BETTER_AUTH_URL?.trim();
  if (!configuredOrigin) throw new Error("BETTER_AUTH_URL is required");
  return new URL(`/verify/${verificationId}`, configuredOrigin).toString();
}

export async function findArtifactVerification(
  artifactType: ArtifactType,
  artifactId: string,
) {
  return db.query.documentVerifications.findFirst({
    where: and(
      eq(documentVerifications.artifactType, artifactType),
      eq(documentVerifications.artifactId, artifactId),
    ),
  });
}

export async function sealDocument(input: {
  verificationId: string;
  organizationId: string;
  teamId?: string | null;
  documentId: string;
  artifactType: ArtifactType;
  artifactId: string;
  sourceBytes: Uint8Array;
  finalizedBytes: Uint8Array;
  finalizedStorageKey: string;
  finalizedFileName: string;
  auditChainKey: string;
  auditEventCount: number;
  auditRootHash: string;
  finalizedAt: Date;
}) {
  const existing = await findArtifactVerification(
    input.artifactType,
    input.artifactId,
  );
  if (existing) return existing;

  const sourceDocumentHash = sha256(input.sourceBytes);
  const finalizedDocumentHash = sha256(input.finalizedBytes);
  const finalizedStorageKey = input.finalizedStorageKey.replace(
    /\.pdf$/i,
    `-${finalizedDocumentHash.slice(0, 16)}.pdf`,
  );
  const manifest: VerificationManifest = {
    schema: "https://sleeksign.app/schemas/document-verification/v1",
    version: 1,
    verificationId: input.verificationId,
    workspaceId: input.organizationId,
    artifact: { type: input.artifactType, id: input.artifactId },
    document: {
      id: input.documentId,
      sourceSha256: sourceDocumentHash,
      finalizedSha256: finalizedDocumentHash,
    },
    audit: {
      chainKey: input.auditChainKey,
      eventCount: input.auditEventCount,
      rootSha256: input.auditRootHash,
    },
    finalizedAt: input.finalizedAt.toISOString(),
  };
  const signed = await signCanonicalManifest(manifest);

  await putObjectBytes(finalizedStorageKey, input.finalizedBytes, {
    contentDisposition: `inline; filename="${input.finalizedFileName.replace(/["\\]/g, "")}"`,
  });

  try {
    await db.insert(documentVerifications).values({
      id: input.verificationId,
      organizationId: input.organizationId,
      teamId: input.teamId || null,
      documentId: input.documentId,
      artifactType: input.artifactType,
      artifactId: input.artifactId,
      sourceDocumentHash,
      finalizedDocumentHash,
      manifest: signed.canonicalManifest,
      manifestHash: signed.manifestHash,
      signature: signed.signature,
      signatureAlgorithm: signed.signatureAlgorithm,
      keyVersion: signed.keyVersion,
      publicKeyFingerprint: signed.publicKeyFingerprint,
      auditChainKey: input.auditChainKey,
      auditRootHash: input.auditRootHash,
      auditEventCount: input.auditEventCount,
      finalizedStorageKey,
      finalizedAt: input.finalizedAt,
    });
  } catch (error) {
    const concurrentReceipt = await findArtifactVerification(
      input.artifactType,
      input.artifactId,
    );
    if (concurrentReceipt) return concurrentReceipt;
    throw error;
  }

  const receipt = await findArtifactVerification(
    input.artifactType,
    input.artifactId,
  );
  if (!receipt) throw new Error("Verification receipt was not persisted");
  return receipt;
}

export async function verifyDocumentReceipt(
  verificationId: string,
  uploadedBytes?: Uint8Array,
) {
  const receipt = await db.query.documentVerifications.findFirst({
    where: eq(documentVerifications.id, verificationId),
    with: { document: true },
  });
  if (!receipt) return { valid: false as const, reason: "not_found" as const };
  if (receipt.status !== "active") {
    return { valid: false as const, reason: "revoked" as const, receipt };
  }

  let manifest: VerificationManifest;
  try {
    manifest = JSON.parse(receipt.manifest) as VerificationManifest;
  } catch {
    return {
      valid: false as const,
      reason: "invalid_receipt" as const,
      receipt,
    };
  }

  const canonicalManifest = canonicalStringify(manifest);
  const manifestMatches =
    canonicalManifest === receipt.manifest &&
    manifest.schema ===
      "https://sleeksign.app/schemas/document-verification/v1" &&
    manifest.version === 1 &&
    manifest.verificationId === receipt.id &&
    manifest.workspaceId === receipt.organizationId &&
    manifest.artifact.type === receipt.artifactType &&
    manifest.artifact.id === receipt.artifactId &&
    manifest.document.id === receipt.documentId &&
    hashesEqual(manifest.document.sourceSha256, receipt.sourceDocumentHash) &&
    hashesEqual(
      manifest.document.finalizedSha256,
      receipt.finalizedDocumentHash,
    ) &&
    manifest.audit.chainKey === receipt.auditChainKey &&
    manifest.audit.eventCount === receipt.auditEventCount &&
    hashesEqual(manifest.audit.rootSha256, receipt.auditRootHash) &&
    new Date(manifest.finalizedAt).getTime() === receipt.finalizedAt.getTime();
  if (!manifestMatches) {
    return {
      valid: false as const,
      reason: "invalid_receipt" as const,
      receipt,
    };
  }

  const signatureValid = await verifyCanonicalManifestSignature({
    canonicalManifest,
    manifestHash: receipt.manifestHash,
    signature: receipt.signature,
    signatureAlgorithm: receipt.signatureAlgorithm,
    keyVersion: receipt.keyVersion,
    publicKeyFingerprint: receipt.publicKeyFingerprint,
  });
  if (!signatureValid) {
    return {
      valid: false as const,
      reason: "invalid_signature" as const,
      receipt,
    };
  }

  const logs = await db.query.auditLogs.findMany({
    where: and(
      eq(auditLogs.organizationId, receipt.organizationId),
      eq(auditLogs.chainKey, receipt.auditChainKey),
    ),
    orderBy: [asc(auditLogs.createdAt)],
  });
  const audit = verifyAuditChain(logs, {
    eventCount: receipt.auditEventCount,
    rootHash: receipt.auditRootHash,
  });
  if (!audit.valid) {
    return {
      valid: false as const,
      reason: "invalid_audit_chain" as const,
      receipt,
    };
  }

  if (uploadedBytes) {
    const uploadedHash = sha256(uploadedBytes);
    if (!hashesEqual(uploadedHash, receipt.finalizedDocumentHash)) {
      return {
        valid: false as const,
        reason: "document_mismatch" as const,
        receipt,
      };
    }
  }

  return {
    valid: true as const,
    reason: null,
    receipt,
    document: receipt.document,
    uploadedDocumentMatched: Boolean(uploadedBytes),
  };
}

export type { ArtifactType, VerificationManifest };
