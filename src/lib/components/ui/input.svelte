<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLInputAttributes } from "svelte/elements";

	let {
		class: className = "",
		value = $bindable(""),
		...rest
	}: HTMLInputAttributes & { value?: string } = $props();
</script>

<input
	class={cn(
		"flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
		className,
	)}
	bind:value
	{...rest}
/>
