import type { RequestHandler } from "./$types";
import { db } from "@/db";
import { documents, fields } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  AccessError,
  requireDocumentAccess,
  requireWorkspaceAccess,
} from "@/lib/server-access";
import {
  deriveSignerRoles,
  parseRoleConfigs,
  serializeRoleConfigs,
  serializeSignerRoles,
} from "@/lib/field-utils";
import { serializeDocumentActivity } from "@/lib/dashboard-activity";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { hasAppPermission } from "@/lib/enterprise-access";

function serializeDocumentRecord(doc: Record<string, unknown>) {
  const roleConfigs = parseRoleConfigs(doc.roleConfigs as string | null | undefined);
  const rawFields = Array.isArray(doc.fields)
    ? (doc.fields as Array<Record<string, unknown> & { assigneeRole?: string | null }>)
    : [];

  return serializeDocumentActivity({
    ...doc,
    signerRoles: deriveSignerRoles(roleConfigs),
    roleConfigs,
    fields: rawFields.map((field) => ({
      ...field,
      assigneeRole: field.assigneeRole === "HR" ? "Owner" : field.assigneeRole || "",
    })) as Array<typeof fields.$inferSelect>,
  });
}

export const GET: RequestHandler = async ({ request: req, params }) => {
  const { id } = params;
  try {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      with: {
        fields: true,
        sessions: true,
      },
    });

    if (!doc) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const access = await requireWorkspaceAccess(req.headers, doc.workspaceId, "read");
    if (
      doc.teamId &&
      !hasAppPermission(access, "documents:view_all") &&
      !access.teamIds.includes(doc.teamId)
    ) {
      throw new AccessError("Forbidden", 403);
    }

    const serializedDocument = serializeDocumentRecord(doc);
    const fileUrl =
      doc.uploadStatus === "ready" && doc.storageKey
        ? `/api/documents/${doc.id}/file`
        : null;

    return Response.json(
      {
        ...serializedDocument,
        fileUrl,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Document fetch error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load document";
    const aborted =
      message.toLowerCase().includes("aborted") ||
      (error instanceof Error && error.name === "AbortError");
    return Response.json(
      { error: aborted ? "Temporary database interruption. Retrying..." : message },
      { status: aborted ? 503 : 500 },
    );
  }
}

export const POST: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const access = await requireDocumentAccess(req.headers, id, "manage");
    const {
      id: requestedFieldId,
      type,
      page,
      x,
      y,
      width,
      height,
      required,
      assigneeRole,
    } =
      await req.json();
    const fieldId =
      typeof requestedFieldId === "string" && requestedFieldId.trim()
        ? requestedFieldId
        : nanoid();

    await db.insert(fields).values({
      id: fieldId,
      documentId: id,
      type,
      page,
      x,
      y,
      width,
      height,
      required: required ?? true,
      assigneeRole: typeof assigneeRole === "string" ? assigneeRole : "",
    });

    await emitAuditEvent({
      organizationId: access.workspaceId,
      teamId: access.document.teamId,
      workspaceId: access.workspaceId,
      documentId: id,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "field.created",
      chainKey: `document:${id}`,
      payload: { fieldId, type, page, assigneeRole: assigneeRole || "" },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ id: fieldId });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json({ error: "Failed to add field" }, { status: 500 });
  }
}

export const DELETE: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const access = await requireDocumentAccess(req.headers, id, "manage", {
      ensureWorkspaceSetup: false,
    });
    const hasBody =
      Number(req.headers.get("content-length") || 0) > 0 ||
      Boolean(req.headers.get("transfer-encoding"));
    const body = hasBody ? await req.json() : null;

    if (body?.fieldId) {
      await db.delete(fields).where(eq(fields.id, body.fieldId));
      await emitAuditEvent({
        organizationId: access.workspaceId,
        teamId: access.document.teamId,
        workspaceId: access.workspaceId,
        documentId: id,
        actorType: "user",
        actorId: access.membership.userId,
        eventType: "field.deleted",
        chainKey: `document:${id}`,
        payload: { fieldId: body.fieldId },
        ...getRequestAuditContext(req.headers),
      });
      return Response.json({ success: true });
    }

    await db
      .update(documents)
      .set({
        deletedAt: new Date(),
        archivedAt: null,
      })
      .where(eq(documents.id, id));

    await emitAuditEvent({
      organizationId: access.workspaceId,
      teamId: access.document.teamId,
      workspaceId: access.workspaceId,
      documentId: id,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "document.deleted",
      chainKey: `document:${id}`,
      payload: { deletedAt: new Date().toISOString() },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 500 },
    );
  }
}

export const PUT: RequestHandler = async ({ request: req, params }) => {
  const { id } = params;
  try {
    const access = await requireDocumentAccess(req.headers, id, "manage");
    const { name, signerRoles, roleConfigs, teamId, requireOtp } = await req.json();
    const updateData: {
      name?: string;
      signerRoles?: string;
      roleConfigs?: string;
      teamId?: string | null;
      requireOtp?: boolean;
      updatedAt?: Date;
    } = {};

    if (typeof name === "string" && name.trim()) {
      updateData.name = name;
    }

    if (Array.isArray(roleConfigs)) {
      updateData.roleConfigs = serializeRoleConfigs(roleConfigs);
      updateData.signerRoles = serializeSignerRoles(
        deriveSignerRoles(roleConfigs),
      );
    }

    if (Array.isArray(signerRoles)) {
      updateData.signerRoles = serializeSignerRoles(signerRoles);
    }

    if (typeof teamId === "string" || teamId === null) {
      updateData.teamId = teamId;
    }

    if (typeof requireOtp === "boolean") {
      updateData.requireOtp = requireOtp;
    }

    updateData.updatedAt = new Date();

    await db.update(documents).set(updateData).where(eq(documents.id, id));
    await emitAuditEvent({
      organizationId: access.workspaceId,
      teamId: updateData.teamId ?? access.document.teamId,
      workspaceId: access.workspaceId,
      documentId: id,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "document.updated",
      chainKey: `document:${id}`,
      payload: {
        name: updateData.name,
        signerRoles,
        roleConfigs,
        teamId: updateData.teamId,
        requireOtp: updateData.requireOtp,
      },
      ...getRequestAuditContext(req.headers),
    });
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json(
      { error: "Failed to rename document" },
      { status: 500 },
    );
  }
}

export const PATCH: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const body = await req.json();

    if (body.fieldId) {
      const {
        fieldId,
        x,
        y,
        width,
        height,
        required,
        assigneeRole,
        documentId,
      } = body;
      if (!documentId) {
        return Response.json(
          { error: "Document ID required" },
          { status: 400 },
        );
      }

        const access = await requireDocumentAccess(req.headers, documentId, "manage");
        await db
          .update(fields)
          .set({
          x,
          y,
          width,
          height,
          required,
          assigneeRole: typeof assigneeRole === "string" ? assigneeRole : "",
          })
          .where(eq(fields.id, fieldId));
        await emitAuditEvent({
          organizationId: access.workspaceId,
          teamId: access.document.teamId,
          workspaceId: access.workspaceId,
          documentId,
          actorType: "user",
          actorId: access.membership.userId,
          eventType: "field.updated",
          chainKey: `document:${documentId}`,
          payload: {
            fieldId,
            x,
            y,
            width,
            height,
            required,
            assigneeRole: assigneeRole || "",
          },
          ...getRequestAuditContext(req.headers),
        });
        return Response.json({ success: true });
      }

    const access = await requireDocumentAccess(req.headers, id, "manage");

    if (body.action === "archive") {
      await db
        .update(documents)
        .set({ archivedAt: new Date(), deletedAt: null })
        .where(eq(documents.id, id));
      await emitAuditEvent({
        organizationId: access.workspaceId,
        teamId: access.document.teamId,
        workspaceId: access.workspaceId,
        documentId: id,
        actorType: "user",
        actorId: access.membership.userId,
        eventType: "document.archived",
        chainKey: `document:${id}`,
        payload: {},
        ...getRequestAuditContext(req.headers),
      });
      return Response.json({ success: true });
    }

    if (body.action === "restore") {
      await db
        .update(documents)
        .set({ archivedAt: null, deletedAt: null })
        .where(eq(documents.id, id));
      await emitAuditEvent({
        organizationId: access.workspaceId,
        teamId: access.document.teamId,
        workspaceId: access.workspaceId,
        documentId: id,
        actorType: "user",
        actorId: access.membership.userId,
        eventType: "document.restored",
        chainKey: `document:${id}`,
        payload: {},
        ...getRequestAuditContext(req.headers),
      });
      return Response.json({ success: true });
    }

    return Response.json(
      { error: "Unsupported action" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json(
      { error: "Failed to update document" },
      { status: 500 },
    );
  }
}
