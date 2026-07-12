import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";

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

function stableStringify(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = value[key];
        return result;
      }, {}),
  );
}

function hashAuditEvent(input: {
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
  const payload = stableStringify(input.payload || {});
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

export type { AuditContextFromRequest, AuditEventInput };
