import { env } from "$env/dynamic/private";

function normalizeOrigin(value: string) {
	const origin = value.startsWith("http") ? value : `https://${value}`;
	return origin.replace(/\/$/, "");
}

export function getSiteUrl(requestOrigin: string) {
	const configuredUrl =
		env.PUBLIC_SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
	return configuredUrl ? normalizeOrigin(configuredUrl) : normalizeOrigin(requestOrigin);
}
