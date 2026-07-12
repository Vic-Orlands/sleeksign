import type { PageLoad } from "./$types";

export const load: PageLoad = ({ url }) => {
	return {
		token: url.searchParams.get("token") ?? undefined,
		next: url.searchParams.get("next") ?? undefined,
	};
};
