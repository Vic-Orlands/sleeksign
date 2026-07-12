<script lang="ts">
	import { Handle, type NodeProps } from "@xyflow/svelte";
	import { scale } from "svelte/transition";

	type RelationshipNodeData = {
		label: string;
		tone: "document" | "shared" | "private" | "recipient";
		eyebrow?: string;
	};

	let { data, sourcePosition, targetPosition }: NodeProps = $props();
</script>

<div
	class="relative min-w-[150px] rounded-md border border-blue-200/50 bg-blue-50/90 px-3.5 py-2.5 text-blue-950 shadow-sm backdrop-blur-sm"
	in:scale={{ duration: 400, start: 0.95 }}
>
	{#if targetPosition}
		<Handle
			type="target"
			position={targetPosition}
			class="!h-1.5 !w-1.5 !border-none !bg-muted-foreground/30"
		/>
	{/if}
	{#if sourcePosition}
		<Handle
			type="source"
			position={sourcePosition}
			class="!h-1.5 !w-1.5 !border-none !bg-muted-foreground/30"
		/>
	{/if}
	{#if data.eyebrow}
		<p class="mb-1.5 text-[8.5px] font-medium uppercase tracking-[0.16em] opacity-60">
			{data.eyebrow}
		</p>
	{/if}
	<p class="text-[12px] font-medium leading-tight">{data.label}</p>
</div>
