import type { ReactNode } from "react";

import { requireHrSession } from "@/lib/server-access";

export default async function HrLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireHrSession();

  return children;
}
