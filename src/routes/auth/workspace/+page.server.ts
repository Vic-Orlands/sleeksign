import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

import {
	createWorkspaceAction,
	listUserWorkspaces,
} from "$lib/server/workspace";

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.authSession;
	if (!session) {
		const next = url.searchParams.get("next");
		redirect(303, next ? `/signin?next=${encodeURIComponent(next)}` : "/signin");
	}

	return {
		workspaces: await listUserWorkspaces(session.user.id),
	};
};

export const actions: Actions = {
	createWorkspace: createWorkspaceAction,
};
