import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { SCAN_PUBLIC_SLUG } from "$lib/codebase-scan";

export const load: PageServerLoad = () => {
  redirect(307, `/scan/${SCAN_PUBLIC_SLUG}`);
};
