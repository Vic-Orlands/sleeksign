<script lang="ts">
	import { enhance } from "$app/forms";
	import { toast } from "svelte-sonner";
	import DashboardHome from "$lib/components/docs/dashboard-home.svelte";
	import DocumentOverviewSheet from "$lib/components/docs/document-overview-sheet.svelte";
	import type { DocumentRecord } from "$lib/components/docs/types";
	import Button from "$lib/components/ui/button.svelte";
	import Dialog from "$lib/components/ui/dialog.svelte";
	import DialogContent from "$lib/components/ui/dialog-content.svelte";
	import DialogDescription from "$lib/components/ui/dialog-description.svelte";
	import DialogFooter from "$lib/components/ui/dialog-footer.svelte";
	import DialogHeader from "$lib/components/ui/dialog-header.svelte";
	import DialogTitle from "$lib/components/ui/dialog-title.svelte";
	import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";
	import type { ActionResult, SubmitFunction } from "@sveltejs/kit";
	import { goto } from "$app/navigation";

	let { data } = $props();

	let query = $state("");
	let overviewDocument = $state<DocumentRecord | null>(null);
	let overviewOpen = $state(false);
	let documentToDelete = $state<DocumentRecord | null>(null);
	let deleting = $state(false);

	const workspaceId = $derived(data.workspaceId || "");
	const documents = $derived((data.documents || []) as DocumentRecord[]);
	const loadError = $derived(data.error || null);

	const sharedDocuments = $derived(
		documents.filter(
			(document) =>
				!document.archivedAt &&
				!document.deletedAt &&
				(Boolean(document.sessions?.length) || Boolean(document.packets?.length)),
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

	const deleteEnhance: SubmitFunction = () => {
		deleting = true;
		return async ({ result, update }) => {
			deleting = false;
			const actionResult = result as ActionResult;
			if (actionResult.type === "success") {
				if (overviewDocument?.id === documentToDelete?.id) {
					overviewOpen = false;
					overviewDocument = null;
				}
				documentToDelete = null;
				toast.success(
					(actionResult.data as { message?: string } | undefined)?.message ||
						"Document deleted",
				);
				await update();
				return;
			}
			if (actionResult.type === "failure") {
				toast.error(
					(actionResult.data as { error?: string } | undefined)?.error ||
						"Failed to delete document",
				);
			}
		};
	};
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
		onSelectDocument={(document) => {
			overviewDocument = document;
			overviewOpen = true;
		}}
		onOverviewDocument={(document) => {
			overviewDocument = document;
			overviewOpen = true;
		}}
		onDeleteDocument={(document) => {
			documentToDelete = document;
		}}
	/>
{/if}

<DocumentOverviewSheet
	bind:open={overviewOpen}
	document={overviewDocument}
	variant="activity"
	onOpenSetup={(document) => {
		overviewOpen = false;
		void goto(`/docs/${document.id}`);
	}}
/>

<Dialog
	open={Boolean(documentToDelete)}
	onOpenChange={(open) => {
		if (!open && !deleting) documentToDelete = null;
	}}
>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Delete document?</DialogTitle>
			<DialogDescription>
				This removes the document from shared activity and document management while keeping
				signer history available in other views.
			</DialogDescription>
		</DialogHeader>
		<div class="rounded-lg border border-border bg-background p-3 text-sm">
			{documentToDelete?.name}
		</div>
		<DialogFooter>
			<Button
				variant="outline"
				disabled={deleting}
				onclick={() => (documentToDelete = null)}
			>
				Cancel
			</Button>
			<form method="POST" action="?/deleteDocument" use:enhance={deleteEnhance}>
				<input type="hidden" name="documentId" value={documentToDelete?.id || ""} />
				<Button type="submit" variant="destructive" loading={deleting}>Delete</Button>
			</form>
		</DialogFooter>
	</DialogContent>
</Dialog>
