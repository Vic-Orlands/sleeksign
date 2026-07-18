<script lang="ts">
	import type { ScanNodeKind } from "$lib/codebase-scan";
	import { cn } from "$lib/utils";
	import { scanKindStyles, scanLegendGroups } from "./scan-kinds";

	let {
		kinds,
		focusKinds = $bindable(null),
	}: {
		kinds: ScanNodeKind[];
		focusKinds: ScanNodeKind[] | null;
	} = $props();
</script>

{#if kinds.length}
	<div
		class="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full bg-card/70 px-5 py-2.5 shadow-[0_1px_2px_rgb(0_0_0_/0.04),0_4px_16px_rgb(0_0_0_/0.06)] backdrop-blur-md max-[680px]:w-[calc(100%-24px)] max-[680px]:justify-center max-[680px]:gap-2.5 max-[680px]:px-3"
		aria-label="Diagram legend"
	>
		{#each scanLegendGroups.filter((group) => group.kinds.some((kind) => kinds.includes(kind))) as group (group.label)}
			{@const style = scanKindStyles[group.kind]}
			{@const Icon = style.icon}
			{@const active = focusKinds?.some((kind) => group.kinds.includes(kind))}
			<button
				type="button"
				class={cn(
					"flex cursor-default items-center gap-1.5 border-0 bg-transparent p-0 text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase transition-all duration-300 hover:text-foreground max-[680px]:text-[8px]",
					active && "text-foreground",
					focusKinds !== null && !active && "opacity-40",
				)}
				onmouseenter={() => (focusKinds = group.kinds)}
				onmouseleave={() => (focusKinds = null)}
				onfocus={() => (focusKinds = group.kinds)}
				onblur={() => (focusKinds = null)}
			>
				<Icon
					weight="fill"
					class={cn(
						"size-3 opacity-80 transition-transform duration-300",
						active && "scale-110",
					)}
					style={`color:${style.color}`}
				/>
				{group.label}
			</button>
		{/each}
	</div>
{/if}
