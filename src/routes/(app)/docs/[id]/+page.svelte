<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import { toast } from "svelte-sonner";
	import DocumentSetupDock from "$lib/components/docs/document-setup-dock.svelte";
	import type { DocumentRecord } from "$lib/components/docs/types";
	import Button from "$lib/components/ui/button.svelte";
	import type { Field } from "$lib/field-utils";
	import type { ActionResult, SubmitFunction } from "@sveltejs/kit";

	let { data } = $props();

	let document = $state<DocumentRecord | null>(null);
	let isSharing = $state(false);

	$effect(() => {
		document = (data.document as DocumentRecord | null) ?? null;
	});

	const loadError = $derived(data.error || null);

	const shareableSessionId = $derived(
		(document?.sessions || []).find((session) => !session.id.startsWith("packet-"))?.id || "",
	);

	function updateFields(documentId: string, fields: Field[]) {
		if (document?.id === documentId) document = { ...document, fields };
	}

	const shareEnhance: SubmitFunction = () => {
		isSharing = true;
		return async ({ result }) => {
			isSharing = false;
			const actionResult = result as ActionResult;
			if (actionResult.type === "success") {
				const sessionId = (actionResult.data as { sessionId?: string } | undefined)?.sessionId;
				if (sessionId) {
					await goto(`/share/${sessionId}`);
					return;
				}
				toast.error("Failed to create session");
				return;
			}
			if (actionResult.type === "failure") {
				toast.error(
					(actionResult.data as { error?: string } | undefined)?.error ||
						"Unable to share document",
				);
			}
		};
	};
</script>

<div class="grid h-full grid-rows-[auto_minmax(0,1fr)] bg-(--paper)">
	<header class="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2.5">
		<div class="flex min-w-0 items-center gap-3">
			<Button variant="ghost" size="sm" onclick={() => goto("/docs")}>← Documents</Button>
			<div class="min-w-0">
				<p class="text-[10px] uppercase tracking-wider text-muted-foreground">Setup</p>
				<h1 class="truncate text-sm font-semibold">
					{document?.name || "Document"}
				</h1>
			</div>
		</div>
		{#if document}
			<div class="flex shrink-0 items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={!shareableSessionId}
					onclick={() => goto(`/share/${shareableSessionId}`)}
				>
					Review
				</Button>
				<form method="POST" action="?/shareDocument" use:enhance={shareEnhance}>
					<input type="hidden" name="mode" value="shared-base" />
					<Button type="submit" size="sm" loading={isSharing}>Share</Button>
				</form>
			</div>
		{/if}
	</header>

	<div class="min-h-0 p-3 sm:p-4">
		{#if loadError && !document}
			<div class="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
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
