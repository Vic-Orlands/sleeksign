import { normalizeRoleConfigs, type WorkflowMode } from "@/lib/field-utils";
import { createSigningPacket } from "@/lib/signing-workflows";
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

	const packetId = await createSigningPacket(documentId, mode, roleConfigs, {
		workspaceId: access.workspaceId,
		teamId: document.teamId ?? null,
		requireOtp: document.requireOtp,
	});

	return { packetId };
}
