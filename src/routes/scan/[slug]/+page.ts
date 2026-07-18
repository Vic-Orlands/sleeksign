import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import {
  SCAN_PUBLIC_SLUG,
  sleeksignScan,
} from "$lib/codebase-scan";

export const load: PageLoad = ({ params }) => {
  if (params.slug !== SCAN_PUBLIC_SLUG) {
    error(404, "Scan not found");
  }
  return { scan: sleeksignScan };
};
