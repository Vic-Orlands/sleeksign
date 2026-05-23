import { WorkspaceSelector } from "@/components/auth/workspace-selector";

export default async function WorkspaceAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <WorkspaceSelector nextPath={next} />;
}
