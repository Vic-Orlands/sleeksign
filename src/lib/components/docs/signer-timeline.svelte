<script lang="ts">
	import { format } from "date-fns";
	import { ClockIcon, EnvelopeSimpleIcon } from "phosphor-svelte";
	import StatusBadge from "$lib/components/docs/status-badge.svelte";
	import type { SigningEntryRecord } from "$lib/components/docs/types";

	let { entries = [] }: { entries?: SigningEntryRecord[] } = $props();
</script>

{#if entries.length === 0}
	<div class="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
		No signing activity yet.
	</div>
{:else}
	<div class="flex flex-col">
		{#each entries as entry, index (entry.id)}
			<div class="relative flex gap-3">
				<div class="flex flex-col items-center">
					<span
						class="flex size-8 items-center justify-center rounded-full border border-border bg-background text-amber-600"
					>
						<ClockIcon class="size-4" />
					</span>
					{#if index < entries.length - 1}
						<span class="h-10 w-px bg-border"></span>
					{/if}
				</div>
				<div class="min-w-0 flex-1 pb-2">
					<div class="flex items-center justify-between gap-2">
						<p class="truncate text-sm font-medium">
							{entry.signerName || "Anonymous signer"}
						</p>
						<StatusBadge status={entry.status} />
					</div>
					<div class="mt-1 flex items-start gap-1">
						<EnvelopeSimpleIcon class="mt-[2px] size-3 text-muted-foreground" />
						<p class="text-xs text-muted-foreground md:w-[80%]">
							{entry.signerEmail || "No email"} signed the document on{" "}
							{format(new Date(entry.createdAt), "PPp")}
						</p>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
