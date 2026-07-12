import type { Handle } from "@sveltejs/kit";
import { building } from "$app/environment";
import { svelteKitHandler } from "better-auth/svelte-kit";

import { auth } from "@/lib/auth";

async function loadSession(headers: Headers) {
	let lastError: unknown;

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			return await auth.api.getSession({ headers });
		} catch (error) {
			lastError = error;
			if (attempt === 0) {
				await new Promise((resolve) => setTimeout(resolve, 150));
			}
		}
	}

	console.error("Session lookup failed:", lastError);
	return null;
}

export const handle: Handle = async ({ event, resolve }) => {
	const session = await loadSession(event.request.headers);

	event.locals.authSession = session;
	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return svelteKitHandler({ event, resolve, auth, building });
};
