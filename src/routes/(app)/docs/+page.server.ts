import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
	archiveDocument,
	deleteDocument,
	restoreDocument,
} from "$lib/server/documents";
import { listDocumentsForAccess } from "$lib/server/page-data";
import { shareDocumentForAccess } from "$lib/server/sharing";
import {
	actionError,
	formString,
	requireAppAccess,
	workspaceActions,
} from "$lib/server/workspace";
import type { WorkflowMode } from "@/lib/field-utils";

export const load: PageServerLoad = async ({ parent }) => {
	const { workspaceId, access } = await parent();
	if (!workspaceId || !access) {
		return { documents: [], workspaceId: workspaceId || "" };
	}

	try {
		const documents = await listDocumentsForAccess(access, {
			includeArchived: true,
			includeDeleted: true,
		});
		return { documents, workspaceId };
	} catch (error) {
		return {
			documents: [],
			workspaceId,
			error: error instanceof Error ? error.message : "Failed to load documents",
		};
	}
};

export const actions: Actions = {
	...workspaceActions,

	shareDocument: async ({ request }) => {
		const data = await request.formData();
		const documentId = formString(data, "documentId");
		const mode = (formString(data, "mode") || "shared-base") as WorkflowMode;
		if (!documentId) return fail(400, { error: "Document ID required" });

		try {
			const { access } = await requireAppAccess("manage");
			const result = await shareDocumentForAccess(access, documentId, mode);
			return { success: true, ...result };
		} catch (error) {
			return actionError(error, "Failed to share document");
		}
	},

	deleteDocument: async ({ request }) => {
		const data = await request.formData();
		const documentId = formString(data, "documentId");
		if (!documentId) return fail(400, { error: "Document ID required" });

		try {
			await requireAppAccess("manage");
			await deleteDocument(request.headers, documentId);
			return { success: true, message: "Document deleted" };
		} catch (error) {
			return actionError(error, "Failed to delete document");
		}
	},

	archiveDocument: async ({ request }) => {
		const data = await request.formData();
		const documentId = formString(data, "documentId");
		if (!documentId) return fail(400, { error: "Document ID required" });

		try {
			await requireAppAccess("manage");
			await archiveDocument(request.headers, documentId);
			return { success: true, message: "Document archived" };
		} catch (error) {
			return actionError(error, "Failed to archive document");
		}
	},

	restoreDocument: async ({ request }) => {
		const data = await request.formData();
		const documentId = formString(data, "documentId");
		if (!documentId) return fail(400, { error: "Document ID required" });

		try {
			await requireAppAccess("manage");
			await restoreDocument(request.headers, documentId);
			return { success: true, message: "Document restored" };
		} catch (error) {
			return actionError(error, "Failed to restore document");
		}
	},
};
