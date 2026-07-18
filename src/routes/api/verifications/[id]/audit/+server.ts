import { and, asc, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

import { db } from "@/db";
import { auditLogs, documentVerifications } from "@/db/schema";
import { parseAuditPayload, verifyAuditChain } from "@/lib/audit";
import { AccessError, requireDocumentAccess } from "@/lib/server-access";

export const GET: RequestHandler = async ({ request, params }) => {
  try {
    const receipt = await db.query.documentVerifications.findFirst({
      where: eq(documentVerifications.id, params.id),
      with: { document: true },
    });
    if (!receipt) return Response.json({ error: "Verification not found" }, { status: 404 });

    await requireDocumentAccess(request.headers, receipt.documentId, "read");
    const logs = await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.organizationId, receipt.organizationId),
        eq(auditLogs.chainKey, receipt.auditChainKey),
      ),
      orderBy: [asc(auditLogs.createdAt)],
    });
    const integrity = verifyAuditChain(logs, {
      eventCount: receipt.auditEventCount,
      rootHash: receipt.auditRootHash,
    });

    return Response.json(
      {
        verification: {
          id: receipt.id,
          status: receipt.status,
          documentId: receipt.documentId,
          documentName: receipt.document.name,
          artifactType: receipt.artifactType,
          artifactId: receipt.artifactId,
          finalizedAt: receipt.finalizedAt,
          finalizedDocumentHash: receipt.finalizedDocumentHash,
          manifestHash: receipt.manifestHash,
          signatureAlgorithm: receipt.signatureAlgorithm,
          keyVersion: receipt.keyVersion,
          publicKeyFingerprint: receipt.publicKeyFingerprint,
          auditRootHash: receipt.auditRootHash,
          auditEventCount: receipt.auditEventCount,
        },
        integrity,
        events: logs.map((log, index) => ({
          id: log.id,
          sequence: index + 1,
          actorType: log.actorType,
          actorEmail: log.actorEmail,
          eventType: log.eventType,
          requestId: log.requestId,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          payload: parseAuditPayload(log.payload),
          eventHash: log.eventHash,
          previousEventHash: log.previousEventHash,
          createdAt: log.createdAt,
          sealed: index < receipt.auditEventCount,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Verification audit lookup failed:", error);
    return Response.json({ error: "Failed to load verification audit" }, { status: 500 });
  }
};
