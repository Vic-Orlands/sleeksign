import { getSiteUrl } from "$lib/server/site-url";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ url }) => {
	const siteUrl = getSiteUrl(url.origin);
	const body = [
		"User-agent: *",
		"Allow: /$",
		"Allow: /verify$",
		"Disallow: /api/",
		"Disallow: /accept-invitation/",
		"Disallow: /architecture",
		"Disallow: /auth/",
		"Disallow: /codebase-scan",
		"Disallow: /docs",
		"Disallow: /forgot-password",
		"Disallow: /reset-password",
		"Disallow: /settings",
		"Disallow: /share/",
		"Disallow: /sign/",
		"Disallow: /signed-docs",
		"Disallow: /signers",
		"Disallow: /signin",
		"Disallow: /signup",
		"Disallow: /shared",
		`Sitemap: ${siteUrl}/sitemap.xml`,
		"",
	].join("\n");

	return new Response(body, {
		headers: {
			"Cache-Control": "public, max-age=3600, s-maxage=86400",
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
