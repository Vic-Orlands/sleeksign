<script lang="ts">
	import { format } from "date-fns";
	import { toast } from "svelte-sonner";
	import StatusBadge from "$lib/components/docs/status-badge.svelte";
	import type { DocumentRecord } from "$lib/components/docs/types";
	import {
		getDocumentCounts,
		getDocumentSetupStatus,
		getDocumentStatus,
	} from "$lib/components/docs/types";
	import Button from "$lib/components/ui/button.svelte";
	import { postFormAction } from "$lib/form-action";
	import type { WorkflowMode } from "$lib/field-utils";

	let {
		document: overviewDocument = null,
		open = $bindable(false),
		onOpenSetup,
	}: {
		document?: DocumentRecord | null;
		open?: boolean;
		onOpenSetup: (document: DocumentRecord) => void;
	} = $props();

	let isCreatingPacket = $state(false);

	const detail = $derived(overviewDocument);
	const counts = $derived(detail ? getDocumentCounts(detail) : null);
	const allFieldsAssigned = $derived(
		detail ? (detail.fields || []).every((field) => Boolean(field.assigneeRole)) : false,
	);

	async function createSessionAndShare(mode: WorkflowMode = "shared-base") {
		if (!detail) return;

		isCreatingPacket = true;
		try {
			const result = await postFormAction<{ sessionId?: string }>(
				"shareDocument",
				{
					documentId: detail.id,
					mode,
				},
				{ apply: false },
			);
			if (!result.sessionId) throw new Error("Failed to prepare share links");
			window.location.href = `/share/${result.sessionId}`;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to prepare share links");
		} finally {
			isCreatingPacket = false;
		}
	}

	function close() {
		open = false;
	}
</script>

{#if open && detail}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex justify-end bg-background/40" onclick={close}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<aside
			class="flex h-full w-[min(92vw,28rem)] flex-col border-l border-border bg-background"
			onclick={(event) => event.stopPropagation()}
		>
			<div class="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
				<div class="min-w-0">
					<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						Overview
					</p>
					<h2 class="mt-1 truncate text-lg font-semibold tracking-tight">{detail.name}</h2>
				</div>
				<Button variant="ghost" size="sm" onclick={close}>Close</Button>
			</div>

			<div class="min-h-0 flex-1 space-y-5 overflow-auto px-5 py-4">
				<div class="flex flex-wrap items-center gap-2">
					<StatusBadge status={getDocumentStatus(detail)} />
					<span class="text-[13px] text-muted-foreground">
						{getDocumentSetupStatus(detail)}
					</span>
				</div>

				{#if counts}
					<div class="grid grid-cols-2 gap-3 text-[13px]">
						<div>
							<p class="text-muted-foreground">Fields</p>
							<p class="font-medium">{counts.fields}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Sessions</p>
							<p class="font-medium">{counts.total}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Completed</p>
							<p class="font-medium">{counts.completed}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Created</p>
							<p class="font-medium">
								{detail.createdAt
									? format(new Date(detail.createdAt), "MMM d, yyyy")
									: "—"}
							</p>
						</div>
					</div>
				{/if}

				{#if !allFieldsAssigned}
					<p class="text-[13px] text-amber-700 dark:text-amber-400">
						Assign every field to a signer role before sharing.
					</p>
				{/if}
			</div>

			<div class="flex flex-col gap-2 border-t border-border px-5 py-4">
				<Button
					onclick={() => onOpenSetup(detail)}
					variant="outline"
					class="w-full justify-center"
				>
					Open setup
				</Button>
				<Button
					onclick={() => createSessionAndShare("shared-base")}
					disabled={isCreatingPacket || !allFieldsAssigned || !(detail.fields || []).length}
					class="w-full justify-center"
				>
					{isCreatingPacket ? "Preparing…" : "Share for signing"}
				</Button>
			</div>
		</aside>
	</div>
{/if}
