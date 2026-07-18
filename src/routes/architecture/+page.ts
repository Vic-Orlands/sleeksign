import type { PageLoad } from "./$types";
import { sleeksignScan } from "$lib/codebase-scan";

export const load: PageLoad = () => {
  return { scan: sleeksignScan };
};
