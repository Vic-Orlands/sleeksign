import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
	createDirectorySigner,
	createSignerGroup,
	deleteDirectorySigner,
	deleteSignerGroup,
	deleteSigningSession,
} from "$lib/server/signers";
import { loadSignersData } from "$lib/server/page-data";
import {
	actionError,
	formString,
	requireAppAccess,
	workspaceActions,
} from "$lib/server/workspace";

export const load: PageServerLoad = async ({ parent }) => {
	const { workspaceId, access } = await parent();
	if (!workspaceId || !access) {
		return {
			documents: [],
			directorySigners: [],
			signerGroups: [],
			teams: [],
			workspaceId: workspaceId || "",
		};
	}

	try {
		const data = await loadSignersData(access);
		return { ...data, workspaceId };
	} catch (error) {
		return {
			documents: [],
			directorySigners: [],
			signerGroups: [],
			teams: [],
			workspaceId,
			error: error instanceof Error ? error.message : "Failed to load signers",
		};
	}
};

export const actions: Actions = {
	...workspaceActions,

	createSigner: async ({ request }) => {
		const data = await request.formData();
		const name = formString(data, "name");
		const email = formString(data, "email");
		const title = formString(data, "title");
		const teamId = formString(data, "teamId") || null;

		try {
			const { access } = await requireAppAccess("signers:manage");
			if (!name || !email) return fail(400, { error: "Name and email are required" });

			await createDirectorySigner(request.headers, {
				workspaceId: access.workspaceId,
				name,
				email,
				title: title || undefined,
				teamId,
			});
			return { success: true, message: "Signer registered" };
		} catch (error) {
			return actionError(error, "Unable to register signer");
		}
	},

	deleteSigner: async ({ request }) => {
		const data = await request.formData();
		const signerId = formString(data, "signerId");
		if (!signerId) return fail(400, { error: "Signer ID required" });

		try {
			const { access } = await requireAppAccess("signers:manage");
			await deleteDirectorySigner(request.headers, access.workspaceId, signerId);
			return { success: true, message: "Signer removed" };
		} catch (error) {
			return actionError(error, "Unable to delete signer");
		}
	},

	createGroup: async ({ request }) => {
		const data = await request.formData();
		const name = formString(data, "name");
		const description = formString(data, "description");
		const signerIds = data.getAll("signerIds").filter((v): v is string => typeof v === "string");

		try {
			const { access } = await requireAppAccess("signers:manage");
			if (!name) return fail(400, { error: "Group name is required" });
			if (signerIds.length === 0) return fail(400, { error: "Select at least one signer" });

			await createSignerGroup(request.headers, {
				workspaceId: access.workspaceId,
				name,
				description: description || undefined,
				signerIds,
			});
			return { success: true, message: "Group created" };
		} catch (error) {
			return actionError(error, "Unable to create group");
		}
	},

	deleteGroup: async ({ request }) => {
		const data = await request.formData();
		const groupId = formString(data, "groupId");
		if (!groupId) return fail(400, { error: "Group ID required" });

		try {
			const { access } = await requireAppAccess("signers:manage");
			await deleteSignerGroup(request.headers, access.workspaceId, groupId);
			return { success: true, message: "Group deleted" };
		} catch (error) {
			return actionError(error, "Failed to delete group");
		}
	},

	deleteActivity: async ({ request }) => {
		const data = await request.formData();
		const sessionId = formString(data, "sessionId");
		if (!sessionId) return fail(400, { error: "Session ID required" });

		try {
			await requireAppAccess("manage");
			await deleteSigningSession(request.headers, sessionId);
			return { success: true, message: "Record deleted" };
		} catch (error) {
			return actionError(error, "Failed to delete record");
		}
	},
};
