<script lang="ts">
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		document.body.classList.add("landing-page");
		return () => {
			document.body.classList.remove("landing-page");
		};
	});
</script>

<main
	class="relative min-h-screen overflow-hidden bg-(--paper) font-sans text-foreground"
>
	{@render children()}
</main>
