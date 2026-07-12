import { loadAppLayoutData } from "$lib/server/workspace";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async () => {
	return loadAppLayoutData();
};
