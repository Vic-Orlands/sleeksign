<script lang="ts">
	import { goto } from "$app/navigation";
	import { toast } from "svelte-sonner";
	import DocumentDetailPanel from "$lib/components/docs/document-detail-panel.svelte";
	import DocumentReviewPanel from "$lib/components/docs/document-review-panel.svelte";
	import DocumentSetupDock from "$lib/components/docs/document-setup-dock.svelte";
	import type { DocumentRecord } from "$lib/components/docs/types";
	import Button from "$lib/components/ui/button.svelte";
	import Sheet from "$lib/components/ui/sheet.svelte";
	import type { Field } from "$lib/field-utils";
	import { fetchSigningPackets } from "$lib/packet-cache";

	let { data } = $props();

	let fieldsByDocId = $state<Record<string, Field[]>>({});
	let reviewOpen = $state(false);
	let shareOpen = $state(false);

	const serverDocument = $derived((data.document as DocumentRecord | null) ?? null);
	const document = $derived.by((): DocumentRecord | null => {
		if (!serverDocument) return null;
		const override = fieldsByDocId[serverDocument.id];
		return override ? { ...serverDocument, fields: override } : serverDocument;
	});

	const loadError = $derived(data.error || null);

	const unassignedCount = $derived(
		(document?.fields || []).filter((field) => !String(field.assigneeRole || "").trim())
			.length,
	);

	const canShare = $derived(Boolean(document?.fields?.length) && unassignedCount === 0);

	const isDocumentUploading = $derived(
		Boolean(document) && (!document?.fileUrl || document.uploadStatus === "pending_upload"),
	);

	$effect(() => {
		const documentId = document?.id;
		if (!documentId) return;
		void fetchSigningPackets(documentId).catch(() => undefined);
	});

	function updateFields(documentId: string, fields: Field[]) {
		fieldsByDocId = { ...fieldsByDocId, [documentId]: fields };
	}

	function openReview() {
		if (!document) return;
		if (isDocumentUploading) {
			toast.error("Wait for the PDF to finish uploading before reviewing");
			return;
		}
		reviewOpen = true;
	}

	function openSharePanel() {
		if (!document) return;
		if (isDocumentUploading) {
			toast.error("Wait for the PDF to finish uploading before sharing");
			return;
		}
		if (unassignedCount > 0) {
			toast.error(
				`Assign all ${unassignedCount} unassigned field${unassignedCount === 1 ? "" : "s"} before sharing`,
			);
			return;
		}
		if (!(document.fields || []).length) {
			toast.error("Add at least one field before sharing");
			return;
		}
		void fetchSigningPackets(document.id).catch(() => undefined);
		shareOpen = true;
	}

	function closeShare() {
		shareOpen = false;
	}

	function closeReview() {
		reviewOpen = false;
	}
</script>

<div class="grid h-full grid-rows-[auto_minmax(0,1fr)] bg-(--paper)">
	<header
		class="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2.5"
	>
		<div class="flex min-w-0 items-center gap-3">
			<Button variant="ghost" size="sm" onclick={() => goto("/docs")}>← Documents</Button>
			<div class="min-w-0">
				<p class="text-[10px] uppercase tracking-wider text-muted-foreground">
					All Documents / Document
				</p>
				<h1 class="truncate text-sm font-semibold">
					{document?.name || "Document"}
				</h1>
			</div>
		</div>
		{#if document}
			<div class="flex shrink-0 items-center gap-2">
				<span
					class="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline"
				>
					{(document.fields || []).length} fields placed
				</span>
				<Button
					variant="outline"
					size="sm"
					onclick={openReview}
					disabled={isDocumentUploading}
				>
					Review
				</Button>
				<Button size="sm" onclick={openSharePanel} disabled={isDocumentUploading}>
					Share Document
				</Button>
			</div>
		{/if}
	</header>

	<div class="min-h-0 p-3 sm:p-4">
		{#if loadError && !document}
			<div
				class="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
			>
				<p>{loadError}</p>
				<Button variant="outline" onclick={() => goto("/docs")}>Back to documents</Button>
			</div>
		{:else if document}
			{#key document.id}
				<DocumentSetupDock {document} onFieldsChange={updateFields} fullHeight />
			{/key}
		{:else}
			<div
				class="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground"
			>
				Preparing document…
			</div>
		{/if}
	</div>
</div>

<Sheet
	bind:open={shareOpen}
	widthClass="w-[min(100vw,36rem)]"
	hideCloseButton
	labelledBy="share-sheet-title"
>
	<span id="share-sheet-title" class="sr-only">Share document</span>
	{#if document}
		<div class="h-full min-h-0 w-full">
			<DocumentDetailPanel
				{document}
				{canShare}
				onClose={closeShare}
				onEdit={() => {
					closeShare();
				}}
			/>
		</div>
	{/if}
</Sheet>

{#if document}
	<Sheet
		bind:open={reviewOpen}
		widthClass="w-[min(100vw,72rem)]"
		hideCloseButton
		labelledBy="review-sheet-title"
	>
		<span id="review-sheet-title" class="sr-only">Review document before sharing</span>
		<div class="h-full min-h-0 w-full">
			<DocumentReviewPanel {document} onClose={closeReview} />
		</div>
	</Sheet>
{/if}
