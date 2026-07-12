<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	let {
		class: className = "",
		children,
	}: {
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<div class={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>
	{@render children?.()}
</div>
