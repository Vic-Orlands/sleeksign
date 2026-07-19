import { nanoid } from "nanoid";

import { db } from "@/db";
import { sessions, signingPackets } from "@/db/schema";
import { normalizeRoleConfigs, type WorkflowMode } from "@/lib/field-utils";
import { getDocumentForAccess } from "$lib/server/page-data";
import type { AppAccess } from "$lib/server/workspace";

export async function shareDocumentForAccess(
	access: AppAccess,
	documentId: string,
	mode: WorkflowMode = "shared-base",
) {
	const document = await getDocumentForAccess(access, documentId);
	const roleConfigs = normalizeRoleConfigs(document.roleConfigs);

	if (!(document.fields || []).length) {
		throw new Error("Add at least one field before sharing");
	}
	if (!(document.fields || []).every((field) => Boolean(field.assigneeRole))) {
		throw new Error("Assign every field to a signer role before sharing");
	}

	const packetId = nanoid();
	await db.insert(signingPackets).values({
		id: packetId,
		documentId,
		workspaceId: access.workspaceId,
		teamId: document.teamId ?? null,
		mode,
		roleConfigs: JSON.stringify(roleConfigs),
		status: "active",
	});

	const sessionId = nanoid();
	await db.insert(sessions).values({
		id: sessionId,
		documentId,
		signerName: "Recipient",
		signerEmail: "",
		signerRole: roleConfigs[0]?.name || "Employee",
		status: "pending",
	});

	return { packetId, sessionId };
}
