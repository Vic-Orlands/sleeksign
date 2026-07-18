import crypto from "crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { canonicalStringify } from "@/lib/canonical-json";

type AuditActorType = "user" | "signer" | "system";

type AuditEventInput = {
  organizationId: string;
  teamId?: string | null;
  workspaceId?: string | null;
  documentId?: string | null;
  packetId?: string | null;
  packetCopyId?: string | null;
  sessionId?: string | null;
  bulkSendJobId?: string | null;
  actorType: AuditActorType;
  actorId?: string | null;
  actorEmail?: string | null;
  eventType: string;
  chainKey: string;
  payload?: Record<string, unknown>;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AuditContextFromRequest = {
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function hashAuditEvent(input: {
  previousEventHash?: string | null;
  eventType: string;
  chainKey: string;
  payload: string;
  actorType: string;
  actorId?: string | null;
  actorEmail?: string | null;
  createdAt: string;
}) {
  return crypto
    .createHash("sha256")
    .update(
      [
        input.previousEventHash || "",
        input.chainKey,
        input.eventType,
        input.actorType,
        input.actorId || "",
        input.actorEmail || "",
        input.createdAt,
        input.payload,
      ].join("|"),
    )
    .digest("hex");
}

export async function emitAuditEvent(input: AuditEventInput) {
  const previousLog = await db.query.auditLogs.findFirst({
    where: and(
      eq(auditLogs.organizationId, input.organizationId),
      eq(auditLogs.chainKey, input.chainKey),
    ),
    orderBy: [desc(auditLogs.createdAt)],
  });

  const createdAt = new Date();
  const payload = canonicalStringify(input.payload || {});
  const eventHash = hashAuditEvent({
    previousEventHash: previousLog?.eventHash || null,
    chainKey: input.chainKey,
    eventType: input.eventType,
    payload,
    actorType: input.actorType,
    actorId: input.actorId || null,
    actorEmail: input.actorEmail || null,
    createdAt: createdAt.toISOString(),
  });

  const id = nanoid();
  await db.insert(auditLogs).values({
    id,
    organizationId: input.organizationId,
    teamId: input.teamId || null,
    workspaceId: input.workspaceId || input.organizationId,
    documentId: input.documentId || null,
    packetId: input.packetId || null,
    packetCopyId: input.packetCopyId || null,
    sessionId: input.sessionId || null,
    bulkSendJobId: input.bulkSendJobId || null,
    actorType: input.actorType,
    actorId: input.actorId || null,
    actorEmail: input.actorEmail || null,
    eventType: input.eventType,
    chainKey: input.chainKey,
    requestId: input.requestId || null,
    ipAddress: input.ipAddress || null,
    userAgent: input.userAgent || null,
    payload,
    eventHash,
    previousEventHash: previousLog?.eventHash || null,
    createdAt,
  });

  return { id, eventHash, previousEventHash: previousLog?.eventHash || null };
}

export function getRequestAuditContext(headers: HeadersInit): AuditContextFromRequest {
  const resolved = headers instanceof Headers ? headers : new Headers(headers);
  return {
    requestId: resolved.get("x-request-id"),
    ipAddress:
      resolved.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      resolved.get("x-real-ip") ||
      null,
    userAgent: resolved.get("user-agent"),
  };
}

export function parseAuditPayload(value: string | null | undefined) {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function getAuditChainSnapshot(
  organizationId: string,
  chainKey: string,
) {
  const logs = await db.query.auditLogs.findMany({
    where: and(
      eq(auditLogs.organizationId, organizationId),
      eq(auditLogs.chainKey, chainKey),
    ),
    orderBy: [asc(auditLogs.createdAt)],
  });
  const verification = verifyAuditChain(logs);
  if (!verification.valid || !verification.rootHash) {
    throw new Error("Audit chain integrity check failed before document finalization");
  }
  return {
    eventCount: logs.length,
    rootHash: verification.rootHash,
  };
}

export function verifyAuditChain(
  logs: Array<typeof auditLogs.$inferSelect>,
  expected?: { eventCount: number; rootHash: string },
) {
  if (logs.length === 0) {
    return { valid: false, rootHash: null, reason: "Audit chain is empty" };
  }

  const byPreviousHash = new Map<string, Array<typeof auditLogs.$inferSelect>>();
  for (const log of logs) {
    const key = log.previousEventHash || "";
    const entries = byPreviousHash.get(key) || [];
    entries.push(log);
    byPreviousHash.set(key, entries);
  }

  const genesis = byPreviousHash.get("") || [];
  if (genesis.length !== 1) {
    return { valid: false, rootHash: null, reason: "Audit chain has no unique origin" };
  }

  let current = genesis[0];
  let count = 0;
  let expectedRootAtCount: string | null = null;
  while (current) {
    const expectedHash = hashAuditEvent({
      previousEventHash: current.previousEventHash,
      chainKey: current.chainKey,
      eventType: current.eventType,
      payload: current.payload,
      actorType: current.actorType,
      actorId: current.actorId,
      actorEmail: current.actorEmail,
      createdAt: current.createdAt.toISOString(),
    });
    if (expectedHash !== current.eventHash) {
      return { valid: false, rootHash: null, reason: "Audit event hash mismatch" };
    }

    count += 1;
    if (expected && count === expected.eventCount) {
      expectedRootAtCount = current.eventHash;
    }
    const next = byPreviousHash.get(current.eventHash) || [];
    if (next.length > 1) {
      return { valid: false, rootHash: null, reason: "Audit chain contains a branch" };
    }
    if (next.length === 0) break;
    current = next[0];
  }

  if (count !== logs.length) {
    return { valid: false, rootHash: null, reason: "Audit chain is disconnected" };
  }
  if (
    expected &&
    (count < expected.eventCount || expectedRootAtCount !== expected.rootHash)
  ) {
    return { valid: false, rootHash: current.eventHash, reason: "Audit receipt does not match the chain" };
  }

  return { valid: true, rootHash: current.eventHash, reason: null };
}

export type { AuditContextFromRequest, AuditEventInput };
