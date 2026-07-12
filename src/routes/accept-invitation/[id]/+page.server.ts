import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { auth } from "$lib/auth";

export const load: PageServerLoad = async ({ params, request }) => {
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session) {
		redirect(
			302,
			`/signin?next=${encodeURIComponent(`/accept-invitation/${params.id}`)}`,
		);
	}

	return {
		invitationId: params.id,
	};
};
