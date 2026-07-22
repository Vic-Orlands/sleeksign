import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { listDocumentsForAccess } from "$lib/server/page-data";
import { deleteSigningEntry } from "$lib/server/signers";
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
		const entryId = formString(data, "entryId");
		const packetId = formString(data, "packetId");
		const artifactKind = formString(data, "artifactKind");
		if (!entryId || !packetId || !["packet", "copy"].includes(artifactKind)) {
			return fail(400, { error: "Signing record details are required" });
		}

		try {
			await requireAppAccess("manage");
			await deleteSigningEntry(request.headers, {
				id: entryId,
				packetId,
				artifactKind: artifactKind as "packet" | "copy",
			});
			return { success: true, message: "Session deleted" };
		} catch (error) {
			return actionError(error, "Failed to delete session");
		}
	},
};
