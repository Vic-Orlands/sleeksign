<script lang="ts">
	import { goto } from "$app/navigation";
	import DashboardHome from "$lib/components/docs/dashboard-home.svelte";
	import DocumentOverviewSheet from "$lib/components/docs/document-overview-sheet.svelte";
	import type { DocumentRecord } from "$lib/components/docs/types";
	import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";

	let { data } = $props();

	let query = $state("");
	let overviewDocument = $state<DocumentRecord | null>(null);
	let overviewOpen = $state(false);

	const workspaceId = $derived(data.workspaceId || "");
	const documents = $derived((data.documents || []) as DocumentRecord[]);
	const loadError = $derived(data.error || null);

	const sharedDocuments = $derived(
		documents.filter(
			(document) =>
				!document.archivedAt &&
				!document.deletedAt &&
				Boolean(document.sessions?.length),
		),
	);

	const filteredDocuments = $derived(
		sharedDocuments.filter((document) =>
			document.name.toLowerCase().includes(query.trim().toLowerCase()),
		),
	);

	$effect(() => {
		if (workspaceId) setCurrentWorkspaceId(workspaceId);
	});
</script>

{#if loadError}
	<div class="flex h-full items-center justify-center p-8 text-sm text-red-600">
		{loadError}
	</div>
{:else}
	<DashboardHome
		{filteredDocuments}
		tableFilter="shared"
		onFilterChange={() => {}}
		bind:query
		onUpload={() => {}}
		{workspaceId}
		isInitialLoading={false}
		pageTitle="Shared activity"
		onSelectDocument={(document) => goto(`/docs/${document.id}`)}
		onOverviewDocument={(document) => {
			overviewDocument = document;
			overviewOpen = true;
		}}
	/>
{/if}

<DocumentOverviewSheet
	bind:open={overviewOpen}
	document={overviewDocument}
	onOpenSetup={(document) => {
		overviewOpen = false;
		void goto(`/docs/${document.id}`);
	}}
/>
