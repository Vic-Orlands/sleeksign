<script lang="ts">
	import DocsTopNav from "@/lib/components/docs/nav.svelte";
	import type { TeamSummary, WorkspaceSummary } from "$lib/server/workspace";
	import type { Snippet } from "svelte";

	let {
		children,
		user,
		workspaceId,
		workspaces,
		teams,
		teamsByWorkspace = {},
	}: {
		children?: Snippet;
		user: {
			id: string;
			name: string;
			email: string;
			image: string | null;
		};
		workspaceId: string;
		workspaces: WorkspaceSummary[];
		teams: TeamSummary[];
		teamsByWorkspace?: Record<string, TeamSummary[]>;
	} = $props();
</script>

<div class="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
	<DocsTopNav {user} {workspaceId} {workspaces} {teams} {teamsByWorkspace} />
	<main class="min-h-0 flex-1 overflow-hidden">
		{@render children?.()}
	</main>
</div>
