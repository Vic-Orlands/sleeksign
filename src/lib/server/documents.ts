import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { documents, fields } from "@/db/schema";
import { serializeDocumentActivity } from "@/lib/dashboard-activity";
import { hasAppPermission } from "@/lib/enterprise-access";
import { deriveSignerRoles, parseRoleConfigs } from "@/lib/field-utils";
import {
	AccessError,
	requireDocumentAccess,
	requireWorkspaceAccess,
} from "@/lib/server-access";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import type { DocumentRecord } from "$lib/components/docs/types";

export async function listDocuments(
	headers: HeadersInit,
	workspaceId: string,
	options?: { includeArchived?: boolean; includeDeleted?: boolean },
): Promise<DocumentRecord[]> {
	const access = await requireWorkspaceAccess(headers, workspaceId, "read");
	const includeArchived = options?.includeArchived ?? true;
	const includeDeleted = options?.includeDeleted ?? true;

	const docs = await db.query.documents.findMany({
		where: and(
			eq(documents.workspaceId, access.workspaceId),
			hasAppPermission(access, "documents:view_all")
				? undefined
				: access.teamIds.length > 0
					? or(inArray(documents.teamId, access.teamIds), isNull(documents.teamId))
					: isNull(documents.teamId),
			includeArchived ? undefined : isNull(documents.archivedAt),
			includeDeleted ? undefined : isNull(documents.deletedAt),
		),
		orderBy: [desc(documents.createdAt)],
		with: {
			sessions: true,
			fields: true,
			packets: {
				with: {
					copies: true,
				},
			},
		},
	});

	return docs.map((doc) => {
		const roleConfigs = parseRoleConfigs(doc.roleConfigs);
		return serializeDocumentActivity({
			...doc,
			signerRoles: deriveSignerRoles(roleConfigs),
			roleConfigs,
			fields: (doc.fields || []).map((field) => ({
				...field,
				assigneeRole: field.assigneeRole || "",
			})),
			fileUrl:
				doc.uploadStatus === "ready" && doc.storageKey
					? `/api/documents/${doc.id}/file`
					: null,
		}) as DocumentRecord;
	});
}

export async function getDocument(
	headers: HeadersInit,
	documentId: string,
): Promise<DocumentRecord> {
	const doc = await db.query.documents.findFirst({
		where: eq(documents.id, documentId),
		with: {
			fields: true,
			sessions: true,
		},
	});

	if (!doc) {
		throw new AccessError("Not found", 404);
	}

	const access = await requireWorkspaceAccess(headers, doc.workspaceId, "read");
	if (
		doc.teamId &&
		!hasAppPermission(access, "documents:view_all") &&
		!access.teamIds.includes(doc.teamId)
	) {
		throw new AccessError("Forbidden", 403);
	}

	const roleConfigs = parseRoleConfigs(doc.roleConfigs);
	return serializeDocumentActivity({
		...doc,
		signerRoles: deriveSignerRoles(roleConfigs),
		roleConfigs,
		fields: (doc.fields || []).map((field) => ({
			...field,
			assigneeRole: field.assigneeRole || "",
		})),
		fileUrl:
			doc.uploadStatus === "ready" && doc.storageKey
				? `/api/documents/${doc.id}/file`
				: null,
	}) as DocumentRecord;
}

export async function archiveDocument(headers: HeadersInit, documentId: string) {
	const access = await requireDocumentAccess(headers, documentId, "manage");
	await db
		.update(documents)
		.set({ archivedAt: new Date(), deletedAt: null })
		.where(eq(documents.id, documentId));
	await emitAuditEvent({
		organizationId: access.workspaceId,
		teamId: access.document.teamId,
		workspaceId: access.workspaceId,
		documentId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "document.archived",
		chainKey: `document:${documentId}`,
		payload: {},
		...getRequestAuditContext(headers),
	});
}

export async function restoreDocument(headers: HeadersInit, documentId: string) {
	const access = await requireDocumentAccess(headers, documentId, "manage");
	await db
		.update(documents)
		.set({ archivedAt: null, deletedAt: null })
		.where(eq(documents.id, documentId));
	await emitAuditEvent({
		organizationId: access.workspaceId,
		teamId: access.document.teamId,
		workspaceId: access.workspaceId,
		documentId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "document.restored",
		chainKey: `document:${documentId}`,
		payload: {},
		...getRequestAuditContext(headers),
	});
}

export async function deleteDocument(headers: HeadersInit, documentId: string) {
	const access = await requireDocumentAccess(headers, documentId, "manage");
	await db
		.update(documents)
		.set({ deletedAt: new Date(), archivedAt: null })
		.where(eq(documents.id, documentId));
	await emitAuditEvent({
		organizationId: access.workspaceId,
		teamId: access.document.teamId,
		workspaceId: access.workspaceId,
		documentId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "document.deleted",
		chainKey: `document:${documentId}`,
		payload: {},
		...getRequestAuditContext(headers),
	});
}

export async function deleteField(
	headers: HeadersInit,
	documentId: string,
	fieldId: string,
) {
	await requireDocumentAccess(headers, documentId, "manage");
	await db.delete(fields).where(eq(fields.id, fieldId));
}
