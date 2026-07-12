import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params, url }) => {
	return {
		token: params.token,
		next: url.searchParams.get("next") ?? undefined,
	};
};
