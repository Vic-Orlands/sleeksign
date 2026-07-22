import { error } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

import { db } from "@/db";
import { signingPackets } from "@/db/schema";
import { parseRoleConfigs } from "@/lib/field-utils";

export const load: PageServerLoad = async ({ params }) => {
	const packet = await db.query.signingPackets.findFirst({
		where: and(eq(signingPackets.id, params.id), isNull(signingPackets.deletedAt)),
		with: {
			document: {
				columns: { id: true, name: true },
			},
		},
	});

	if (!packet?.document) {
		error(404, "Signing packet not found");
	}

	return {
		packet: {
			id: packet.id,
			document: packet.document,
			roleConfigs: parseRoleConfigs(packet.roleConfigs),
		},
	};
};
