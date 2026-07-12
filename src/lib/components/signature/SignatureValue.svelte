<script lang="ts">
	import { decodeSignatureVector } from "$lib/field-utils";
	import { cn } from "$lib/utils";

	let {
		value,
		class: className = "",
	}: {
		value?: string;
		class?: string;
	} = $props();

	const vector = $derived(decodeSignatureVector(value));
</script>

{#if vector}
	<svg
		viewBox={vector.viewBox}
		preserveAspectRatio="xMidYMid meet"
		class={cn("block h-full w-full", className)}
		aria-label={vector.name}
	>
		<path d={vector.pathData} fill="currentColor" />
	</svg>
{:else if value?.startsWith("data:image")}
	<img src={value} alt="Signature" class={cn("h-full w-full object-contain", className)} />
{:else}
	<span class={className}>{value}</span>
{/if}
