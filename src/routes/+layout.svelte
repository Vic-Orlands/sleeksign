<script lang="ts">
	import { dev } from "$app/environment";
	import { onNavigate } from "$app/navigation";
	import { page } from "$app/state";
	import { injectAnalytics } from "@vercel/analytics/sveltekit";
	import { ModeWatcher } from "mode-watcher";
	import { Toaster } from "svelte-sonner";
	import {
		getSeoMetadata,
		SITE_DESCRIPTION,
		SITE_NAME,
		SOCIAL_IMAGE_ALT,
		SOCIAL_IMAGE_PATH,
	} from "$lib/seo";
	import "../app.css";

	let { children, data } = $props();
	const seo = $derived(getSeoMetadata(page.url.pathname));
	const canonicalUrl = $derived(`${data.siteUrl}${page.url.pathname}`);
	const socialImageUrl = $derived(`${data.siteUrl}${SOCIAL_IMAGE_PATH}`);
	const structuredData = $derived(
		JSON.stringify({
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			name: SITE_NAME,
			applicationCategory: "BusinessApplication",
			operatingSystem: "Web",
			url: data.siteUrl,
			description: SITE_DESCRIPTION,
			featureList: [
				"Visual document workflow mapping",
				"Multi-party electronic signatures",
				"Signer role assignment",
				"Document integrity verification",
				"Audit trails",
			],
		}).replace(/</g, "\\u003c"),
	);
	const structuredDataTag = $derived(
		'<script type="application/ld+json">' + structuredData + "</" + "script>",
	);

	injectAnalytics({ mode: dev ? "development" : "production" });

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

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<meta name="robots" content={seo.index ? "index, follow" : "noindex, nofollow"} />
	<meta name="googlebot" content={seo.index ? "index, follow" : "noindex, nofollow"} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/site.webmanifest" />
	<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#171717" />
	<meta name="theme-color" content="#faf8f3" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#171717" media="(prefers-color-scheme: dark)" />
	<meta name="color-scheme" content="light dark" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={socialImageUrl} />
	<meta property="og:image:secure_url" content={socialImageUrl} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={SOCIAL_IMAGE_ALT} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={socialImageUrl} />
	<meta name="twitter:image:alt" content={SOCIAL_IMAGE_ALT} />
	{#if page.url.pathname === "/"}
		{@html structuredDataTag}
	{/if}
</svelte:head>

<ModeWatcher defaultMode="light" track={false} />
<Toaster position="bottom-right" richColors />
{@render children()}
