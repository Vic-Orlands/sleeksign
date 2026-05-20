import { and, eq } from "drizzle-orm";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { authMember, documents, sessions } from "@/db/schema";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
type WorkspacePermission = "read" | "manage" | "owner";

class AccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function hasManageRole(role?: string | null) {
  return Boolean(
    role
      ?.split(",")
      .map((value) => value.trim())
      .some((value) => value === "owner" || value === "admin"),
  );
}

function hasOwnerRole(role?: string | null) {
  return Boolean(
    role
      ?.split(",")
      .map((value) => value.trim())
      .some((value) => value === "owner"),
  );
}

function assertPermission(role: string | null, permission: WorkspacePermission) {
  if (permission === "read") return;
  if (permission === "manage" && hasManageRole(role)) return;
  if (permission === "owner" && hasOwnerRole(role)) return;
  throw new AccessError("Forbidden", 403);
}

async function getSessionFromHeaders(input: HeadersInit) {
  return auth.api.getSession({ headers: input });
}

async function requireSessionFromHeaders(input: HeadersInit): Promise<AuthSession> {
  const session = await getSessionFromHeaders(input);
  if (!session) throw new AccessError("Unauthorized", 401);
  return session;
}

async function findMembership(userId: string, workspaceId: string) {
  return db.query.authMember.findFirst({
    where: and(
      eq(authMember.userId, userId),
      eq(authMember.organizationId, workspaceId),
    ),
  });
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

  const membership = await findMembership(session.user.id, workspaceId);
  if (!membership) {
    throw new AccessError("Forbidden", 403);
  }

  assertPermission(membership.role, permission);

  return { session, workspaceId, membership };
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

  return { ...access, signingSession };
}

async function requireHrSession() {
  const session = await getSessionFromHeaders(await nextHeaders());
  if (!session) {
    redirect("/signin");
  }

  return session;
}

export {
  AccessError,
  assertPermission,
  getSessionFromHeaders,
  hasManageRole,
  hasOwnerRole,
  requireDocumentAccess,
  requireHrSession,
  requireSessionFromHeaders,
  requireSigningSessionAccess,
  requireWorkspaceAccess,
};
