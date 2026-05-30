import { eq, inArray, isNull, or } from "drizzle-orm";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  documents,
  sessions,
  signingPackets,
  type authMember,
} from "@/db/schema";
import {
  type AppPermission,
  hasAppPermission,
  hasWorkspaceManageRole,
  hasWorkspaceOwnerRole,
  resolveWorkspaceAccess,
  type ResolvedAccess,
} from "@/lib/enterprise-access";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
type WorkspacePermission = "read" | "manage" | "owner" | AppPermission;
const SESSION_RETRY_DELAYS_MS = [150, 350];

class AccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function mapPermission(permission: WorkspacePermission): AppPermission | null {
  if (permission === "read") return "documents:view";
  if (permission === "manage") return "documents:manage";
  if (permission === "owner") return null;
  return permission;
}

function assertPermission(
  access: Pick<ResolvedAccess, "membership" | "permissions">,
  permission: WorkspacePermission,
) {
  if (permission === "owner") {
    if (hasWorkspaceOwnerRole(access.membership.role)) return;
    throw new AccessError("Forbidden", 403);
  }

  const mappedPermission = mapPermission(permission);
  if (!mappedPermission || hasAppPermission(access, mappedPermission)) return;
  throw new AccessError("Forbidden", 403);
}

function buildTeamScopeCondition(
  teamId: string | null | undefined,
  access: ResolvedAccess,
  viewAllPermission: AppPermission,
) {
  if (!teamId) return undefined;
  if (hasAppPermission(access, viewAllPermission)) return undefined;
  if (access.teamIds.length === 0) {
    throw new AccessError("Forbidden", 403);
  }

  return or(inArray((teamId as never), access.teamIds), isNull((teamId as never)));
}

async function getSessionFromHeaders(input: HeadersInit) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= SESSION_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await auth.api.getSession({ headers: input });
    } catch (error) {
      lastError = error;
      if (!isRetryableSessionError(error) || attempt === SESSION_RETRY_DELAYS_MS.length) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, SESSION_RETRY_DELAYS_MS[attempt]),
      );
    }
  }

  throw lastError;
}

async function requireSessionFromHeaders(input: HeadersInit): Promise<AuthSession> {
  const session = await getSessionFromHeaders(input);
  if (!session) throw new AccessError("Unauthorized", 401);
  return session;
}

async function requireWorkspaceAccess(
  input: HeadersInit,
  requestedWorkspaceId?: string | null,
  permission: WorkspacePermission = "read",
) {
  const session = await requireSessionFromHeaders(input);
  const workspaceId =
    requestedWorkspaceId || session.session.activeOrganizationId || "";

  if (!workspaceId) {
    throw new AccessError("No active workspace", 400);
  }

  const resolved = await resolveWorkspaceAccess(session.user.id, workspaceId);
  if (!resolved) {
    throw new AccessError("Forbidden", 403);
  }

  assertPermission(resolved, permission);

  return {
    session,
    workspaceId,
    membership: resolved.membership,
    teamIds: resolved.teamIds,
    permissions: resolved.permissions,
    defaultTeamId: resolved.defaultTeamId,
    workspace: resolved.workspace,
  };
}

async function requireDocumentAccess(
  input: HeadersInit,
  documentId: string,
  permission: WorkspacePermission = "read",
) {
  const document = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });

  if (!document) {
    throw new AccessError("Document not found", 404);
  }

  const access = await requireWorkspaceAccess(
    input,
    document.workspaceId,
    permission,
  );

  if (
    document.teamId &&
    !hasAppPermission(access, "documents:view_all") &&
    !access.teamIds.includes(document.teamId)
  ) {
    throw new AccessError("Forbidden", 403);
  }

  return { ...access, document };
}

async function requireSigningSessionAccess(
  input: HeadersInit,
  signingSessionId: string,
  permission: WorkspacePermission = "read",
) {
  const signingSession = await db.query.sessions.findFirst({
    where: eq(sessions.id, signingSessionId),
    with: {
      document: true,
    },
  });

  if (!signingSession?.document) {
    throw new AccessError("Document not found", 404);
  }

  const access = await requireWorkspaceAccess(
    input,
    signingSession.document.workspaceId,
    permission,
  );

  if (
    signingSession.document.teamId &&
    !hasAppPermission(access, "signers:view_all") &&
    !access.teamIds.includes(signingSession.document.teamId)
  ) {
    throw new AccessError("Forbidden", 403);
  }

  return { ...access, signingSession };
}

async function requirePacketAccess(
  input: HeadersInit,
  packetId: string,
  permission: WorkspacePermission = "read",
) {
  const packet = await db.query.signingPackets.findFirst({
    where: eq(signingPackets.id, packetId),
    with: {
      document: true,
    },
  });

  if (!packet?.document) {
    throw new AccessError("Packet not found", 404);
  }

  const access = await requireWorkspaceAccess(
    input,
    packet.workspaceId,
    permission === "read" ? "documents:view" : permission,
  );

  if (
    packet.teamId &&
    !hasAppPermission(access, "packets:view_all") &&
    !access.teamIds.includes(packet.teamId)
  ) {
    throw new AccessError("Forbidden", 403);
  }

  return { ...access, packet };
}

async function requireHrSession() {
  const session = await getSessionFromHeaders(await nextHeaders());
  if (!session) {
    redirect("/signin");
  }

  return session;
}

function canManageWorkspaceMembers(member: typeof authMember.$inferSelect | null) {
  return hasWorkspaceManageRole(member?.role);
}

function isRetryableSessionError(error: unknown) {
  const details = collectErrorDetails(error);
  return details.some((detail) => {
    const normalized = detail.toLowerCase();
    return (
      normalized.includes("failed_to_get_session") ||
      normalized.includes("failed to get session") ||
      normalized.includes("fetch failed") ||
      normalized.includes("error connecting to database") ||
      normalized.includes("internal_server_error")
    );
  });
}

function collectErrorDetails(error: unknown): string[] {
  const details: string[] = [];
  const seen = new Set<unknown>();

  function visit(value: unknown) {
    if (!value || seen.has(value)) return;
    seen.add(value);

    if (typeof value === "string") {
      details.push(value);
      return;
    }

    if (value instanceof Error) {
      details.push(value.name, value.message);
      const errorWithBody = value as Error & {
        code?: unknown;
        status?: unknown;
        statusCode?: unknown;
        body?: unknown;
        cause?: unknown;
      };
      if (typeof errorWithBody.code === "string") details.push(errorWithBody.code);
      if (typeof errorWithBody.status === "string") details.push(errorWithBody.status);
      if (typeof errorWithBody.statusCode === "string") details.push(errorWithBody.statusCode);
      if (typeof errorWithBody.statusCode === "number") details.push(String(errorWithBody.statusCode));
      visit(errorWithBody.body);
      visit(errorWithBody.cause);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value === "object") {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        visit(nested);
      }
    }
  }

  visit(error);
  return details;
}

export {
  AccessError,
  assertPermission,
  buildTeamScopeCondition,
  canManageWorkspaceMembers,
  getSessionFromHeaders,
  hasWorkspaceManageRole as hasManageRole,
  hasWorkspaceOwnerRole as hasOwnerRole,
  requireDocumentAccess,
  requireHrSession,
  requirePacketAccess,
  requireSessionFromHeaders,
  requireSigningSessionAccess,
  requireWorkspaceAccess,
};
