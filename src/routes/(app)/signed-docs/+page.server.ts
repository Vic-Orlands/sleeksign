import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { listDocumentsForAccess } from "$lib/server/page-data";
import { deleteSigningSession } from "$lib/server/signers";
import {
	actionError,
	formString,
	requireAppAccess,
	workspaceActions,
} from "$lib/server/workspace";

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

	deleteSignedSession: async ({ request }) => {
		const data = await request.formData();
		const sessionId = formString(data, "sessionId");
		if (!sessionId) return fail(400, { error: "Session ID required" });

		try {
			await requireAppAccess("manage");
			await deleteSigningSession(request.headers, sessionId);
			return { success: true, message: "Session deleted" };
		} catch (error) {
			return actionError(error, "Failed to delete session");
		}
	},
};
