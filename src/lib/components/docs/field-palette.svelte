<script lang="ts">
	import { cn } from "$lib/utils";
	import type { FieldType } from "$lib/field-utils";

	export type FieldToolType = FieldType | "select";

	let {
		selectedType,
		fieldCounts,
		onSelectType,
	}: {
		selectedType: FieldToolType;
		fieldCounts: Record<FieldType, number>;
		onSelectType: (type: FieldToolType) => void;
	} = $props();

	const fieldTools: Array<{
		type: FieldToolType;
		label: string;
		accent: string;
	}> = [
		{ type: "select", label: "Select", accent: "bg-zinc-400" },
		{ type: "signature", label: "Signature", accent: "bg-blue-500" },
		{ type: "text", label: "Text", accent: "bg-emerald-500" },
		{ type: "date", label: "Date", accent: "bg-amber-500" },
		{ type: "checkbox", label: "Checkbox", accent: "bg-violet-500" },
	];
</script>

<div class="grid flex-1 grid-cols-2 gap-1.5 sm:grid-cols-4 lg:flex lg:flex-col">
	{#each fieldTools as tool (tool.type)}
		{@const active = selectedType === tool.type}
		<button
			type="button"
			onclick={() => onSelectType(tool.type)}
			class={cn(
				"flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border border-dashed border-border bg-card px-2 text-sm transition-colors",
				active
					? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
					: "hover:bg-muted",
			)}
		>
			<span class="flex min-w-0 items-center gap-2 font-mono text-[9px] font-medium">
				<span class={cn("size-2 shrink-0 rounded-full", tool.accent)}></span>
				<span class="truncate">{tool.label}</span>
			</span>
			<span
				class={cn(
					"font-mono text-[10px]",
					active ? "text-primary-foreground/80" : "text-muted-foreground",
				)}
			>
				{tool.type === "select" ? "" : fieldCounts[tool.type as FieldType] || 0}
			</span>
		</button>
	{/each}
</div>
