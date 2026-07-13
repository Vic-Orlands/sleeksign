import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

import { db } from "@/db";
import { sessions } from "@/db/schema";

export const load: PageServerLoad = async ({ params }) => {
	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, params.id),
		columns: {
			id: true,
			documentId: true,
			signerName: true,
			status: true,
		},
	});

	if (!session) {
		error(404, "Session not found");
	}

	return { session };
};
