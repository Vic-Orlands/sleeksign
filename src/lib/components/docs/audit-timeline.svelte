<script lang="ts">
	import { format } from "date-fns";
	import { CaretDownIcon, ClockIcon, ShieldCheckIcon } from "phosphor-svelte";

	export type AuditRecord = {
		id: string;
		eventType: string;
		actorEmail?: string | null;
		createdAt: string;
		ipAddress?: string | null;
	};

	let { logs = [] }: { logs?: AuditRecord[] } = $props();

	/** Group consecutive same-type events within this window as "simultaneous". */
	const SIMULTANEOUS_MS = 5_000;

	type AuditGroup = {
		id: string;
		eventType: string;
		primary: AuditRecord;
		items: AuditRecord[];
	};

	const groups = $derived.by((): AuditGroup[] => {
		const sorted = [...logs].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		const result: AuditGroup[] = [];

		for (const log of sorted) {
			const last = result[result.length - 1];
			if (
				last &&
				last.eventType === log.eventType &&
				Math.abs(
					new Date(last.primary.createdAt).getTime() - new Date(log.createdAt).getTime(),
				) <= SIMULTANEOUS_MS
			) {
				last.items.push(log);
				continue;
			}
			result.push({
				id: log.id,
				eventType: log.eventType,
				primary: log,
				items: [log],
			});
		}

		return result.slice(0, 30);
	});

	let expandedIds = $state<Record<string, boolean>>({});

	function toggle(groupId: string) {
		expandedIds = { ...expandedIds, [groupId]: !expandedIds[groupId] };
	}

	function formatEvent(eventType: string) {
		return eventType.replace(/\./g, " · ");
	}
</script>

{#if groups.length === 0}
	<div class="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
		No audit events yet.
	</div>
{:else}
	<div class="flex flex-col">
		{#each groups as group, index (group.id)}
			{@const expanded = Boolean(expandedIds[group.id])}
			{@const hasMany = group.items.length > 1}
			<div class="relative flex gap-3">
				<div class="flex flex-col items-center">
					<span
						class="flex size-8 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
					>
						<ShieldCheckIcon class="size-4" />
					</span>
					{#if index < groups.length - 1}
						<span class="h-10 w-px bg-border"></span>
					{/if}
				</div>
				<div class="min-w-0 flex-1 pb-3">
					<div class="flex items-center justify-between gap-2">
						<p class="truncate font-mono text-[11px] font-semibold uppercase tracking-wider">
							{formatEvent(group.eventType)}
						</p>
						{#if hasMany}
							<button
								type="button"
								class="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/50"
								onclick={() => toggle(group.id)}
							>
								{group.items.length} events
								<CaretDownIcon
									class="size-3 transition-transform {expanded ? 'rotate-180' : ''}"
								/>
							</button>
						{/if}
					</div>
					<div class="mt-1 flex items-start gap-1">
						<ClockIcon class="mt-[2px] size-3 text-muted-foreground" />
						<p class="text-xs text-muted-foreground md:w-[90%]">
							{group.primary.actorEmail || "system"} ·{" "}
							{format(new Date(group.primary.createdAt), "PPp")}
							{#if group.primary.ipAddress}
								· IP {group.primary.ipAddress}
							{/if}
						</p>
					</div>

					{#if hasMany && expanded}
						<div class="mt-2 space-y-2 border-l-2 border-sky-500/20 pl-3">
							{#each group.items as item (item.id)}
								<div class="text-xs text-muted-foreground">
									<p class="font-medium text-foreground">
										{item.actorEmail || "system"}
									</p>
									<p>
										{format(new Date(item.createdAt), "PPp")}
										{#if item.ipAddress}
											· IP {item.ipAddress}
										{:else}
											· IP N/A
										{/if}
									</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
