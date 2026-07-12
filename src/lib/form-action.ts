import { deserialize } from "$app/forms";
import { applyAction } from "$app/forms";
import type { ActionResult } from "@sveltejs/kit";

/**
 * Post a SvelteKit form action without a full-page navigation.
 * Prefer this over REST /api calls for app mutations.
 */
export async function postFormAction<T extends Record<string, unknown> = Record<string, unknown>>(
	action: string,
	fields: Record<string, string | number | boolean | null | undefined> = {},
	options?: { actionUrl?: string; apply?: boolean },
): Promise<T> {
	const formData = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		if (value === undefined || value === null) continue;
		formData.set(key, String(value));
	}

	const actionUrl = options?.actionUrl ?? "";
	const url = action.startsWith("?/")
		? `${actionUrl}${action}`
		: `${actionUrl}?/${action}`;

	const response = await fetch(url, {
		method: "POST",
		body: formData,
		headers: {
			"x-sveltekit-action": "true",
		},
		credentials: "include",
	});

	const result = deserialize(await response.text()) as ActionResult<T, { error?: string }>;

	if (options?.apply !== false) {
		await applyAction(result);
	}

	if (result.type === "failure") {
		throw new Error(result.data?.error || `Action ${action} failed`);
	}
	if (result.type === "error") {
		throw new Error(result.error?.message || `Action ${action} failed`);
	}
	if (result.type === "redirect") {
		return {} as T;
	}

	return (result.data || {}) as T;
}
