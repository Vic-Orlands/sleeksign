import { getSiteUrl } from "$lib/server/site-url";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ url }) => {
	const siteUrl = getSiteUrl(url.origin);
	const routes = [
		{ path: "", priority: "1.0", changefreq: "weekly" },
		{ path: "/verify", priority: "0.7", changefreq: "monthly" },
	];
	const entries = routes
		.map(
			({ path, priority, changefreq }) =>
				`  <url>\n    <loc>${siteUrl}${path || "/"}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
		)
		.join("\n");
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;

	return new Response(body, {
		headers: {
			"Cache-Control": "public, max-age=3600, s-maxage=86400",
			"Content-Type": "application/xml; charset=utf-8",
		},
	});
};
