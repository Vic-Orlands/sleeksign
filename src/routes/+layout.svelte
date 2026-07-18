<script lang="ts">
	import { dev } from "$app/environment";
	import { onNavigate } from "$app/navigation";
	import { inject } from "@vercel/analytics";
	import { ModeWatcher } from "mode-watcher";
	import { Toaster } from "svelte-sonner";
	import "../app.css";

	let { children } = $props();

	inject({ mode: dev ? "development" : "production" });

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		const path = navigation.to?.url.pathname ?? "";
		const isAuthTransition =
			path.startsWith("/signin") ||
			path.startsWith("/signup") ||
			path.startsWith("/forgot-password") ||
			path.startsWith("/reset-password");

		// Keep view transitions off app shell navigations — they stall when
		// a slow Neon load is aborted by a second click.
		if (!isAuthTransition) return;

		return new Promise<void>((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<ModeWatcher defaultMode="light" track={false} />
<Toaster position="bottom-right" richColors />
{@render children()}
