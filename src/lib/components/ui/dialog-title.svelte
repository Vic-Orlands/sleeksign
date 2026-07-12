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

<h2 class={cn("text-base font-semibold text-foreground", className)}>
	{@render children?.()}
</h2>
