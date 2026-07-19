import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Actions, PageServerLoad } from "./$types";

import { db } from "@/db";
import { documents, fields } from "@/db/schema";
import { getDocumentForAccess } from "$lib/server/page-data";
import { shareDocumentForAccess } from "$lib/server/sharing";
import {
	actionError,
	formString,
	requireAppAccess,
	workspaceActions,
} from "$lib/server/workspace";
import {
	deriveSignerRoles,
	parseRoleConfigs,
	serializeRoleConfigs,
	serializeSignerRoles,
	type WorkflowMode,
} from "@/lib/field-utils";

export const load: PageServerLoad = async ({ parent, params }) => {
	const { access } = await parent();
	if (!access) {
		return { document: null, error: "Select a workspace to open this document" };
	}

	try {
		const document = await getDocumentForAccess(access, params.id);
		return { document };
	} catch (error) {
		return {
			document: null,
			error: error instanceof Error ? error.message : "Failed to load document",
		};
	}
};

export const actions: Actions = {
	...workspaceActions,

	shareDocument: async ({ request, params }) => {
		const data = await request.formData();
		const mode = (formString(data, "mode") || "shared-base") as WorkflowMode;

		try {
			const { access } = await requireAppAccess("manage");
			const result = await shareDocumentForAccess(access, params.id, mode);
			return { success: true, ...result };
		} catch (error) {
			return actionError(error, "Failed to share document");
		}
	},

	addField: async ({ request, params }) => {
		const data = await request.formData();
		try {
			await requireAppAccess("manage");
			const fieldId = formString(data, "id") || nanoid();
			const type = formString(data, "type") || "text";
			await db.insert(fields).values({
				id: fieldId,
				documentId: params.id,
				type: type as "signature" | "text" | "date" | "checkbox",
				page: Number(formString(data, "page") || 0),
				x: Number(formString(data, "x") || 0),
				y: Number(formString(data, "y") || 0),
				width: Number(formString(data, "width") || 20),
				height: Number(formString(data, "height") || 5),
				required: formString(data, "required") !== "false",
				assigneeRole: formString(data, "assigneeRole") || "",
			});
			return { success: true, fieldId };
		} catch (error) {
			return actionError(error, "Failed to add field");
		}
	},

	updateField: async ({ request }) => {
		const data = await request.formData();
		const fieldId = formString(data, "fieldId");
		if (!fieldId) return fail(400, { error: "Field ID required" });

		try {
			await requireAppAccess("manage");
			await db
				.update(fields)
				.set({
					x: Number(formString(data, "x") || 0),
					y: Number(formString(data, "y") || 0),
					width: Number(formString(data, "width") || 20),
					height: Number(formString(data, "height") || 5),
					required: formString(data, "required") !== "false",
					assigneeRole: formString(data, "assigneeRole") || "",
				})
				.where(eq(fields.id, fieldId));
			return { success: true };
		} catch (error) {
			return actionError(error, "Failed to update field");
		}
	},

	deleteField: async ({ request }) => {
		const data = await request.formData();
		const fieldId = formString(data, "fieldId");
		if (!fieldId) return fail(400, { error: "Field ID required" });

		try {
			await requireAppAccess("manage");
			await db.delete(fields).where(eq(fields.id, fieldId));
			return { success: true };
		} catch (error) {
			return actionError(error, "Failed to delete field");
		}
	},

	saveRoleConfigs: async ({ request, params }) => {
		const data = await request.formData();
		const raw = formString(data, "roleConfigs");
		if (!raw) return fail(400, { error: "Role configs required" });

		try {
			await requireAppAccess("manage");
			const parsed = parseRoleConfigs(raw);
			await db
				.update(documents)
				.set({
					roleConfigs: serializeRoleConfigs(parsed),
					signerRoles: serializeSignerRoles(deriveSignerRoles(parsed)),
				})
				.where(eq(documents.id, params.id));
			return { success: true };
		} catch (error) {
			return actionError(error, "Failed to save roles");
		}
	},
};
