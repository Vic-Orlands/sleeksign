import { getSiteUrl } from "$lib/server/site-url";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ url }) => ({
	siteUrl: getSiteUrl(url.origin),
});
