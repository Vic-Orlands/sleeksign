<script lang="ts">
	import DocsAppFrame from "$lib/components/docs/docs-app-frame.svelte";
	import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";
	import type { LayoutData } from "./$types";
	import type { Snippet } from "svelte";

	let { data, children }: { data: LayoutData; children?: Snippet } = $props();

	$effect(() => {
		if (data.workspaceId) setCurrentWorkspaceId(data.workspaceId);
	});
</script>

<DocsAppFrame
	user={data.user}
	workspaceId={data.workspaceId}
	workspaces={data.workspaces}
	teams={data.teams}
	teamsByWorkspace={data.teamsByWorkspace}
>
	{@render children?.()}
</DocsAppFrame>
