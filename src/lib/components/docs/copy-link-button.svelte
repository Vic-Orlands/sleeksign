<script lang="ts">
	import { CheckIcon, CopyIcon } from "phosphor-svelte";
	import Button from "$lib/components/ui/button.svelte";
	import { cn } from "$lib/utils";

	let {
		url,
		disabled = false,
		class: className = "",
	}: {
		url: string;
		disabled?: boolean;
		class?: string;
	} = $props();

	let copied = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | null = null;

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			if (resetTimer) clearTimeout(resetTimer);
			resetTimer = setTimeout(() => {
				copied = false;
				resetTimer = null;
			}, 1800);
		} catch {
			copied = false;
		}
	}
</script>

<Button
	variant="outline"
	class={cn("relative w-full min-w-26 overflow-hidden sm:w-auto", className)}
	{disabled}
	aria-label={copied ? "Copied" : "Copy link"}
	onclick={handleCopy}
>
	<span
		class={cn(
			"inline-flex items-center gap-1.5 transition-[opacity,transform,filter] duration-200 ease-out motion-reduce:transition-none",
			copied
				? "pointer-events-none absolute opacity-0 scale-95 blur-[2px]"
				: "opacity-100 scale-100 blur-0",
		)}
		aria-hidden={copied}
	>
		<CopyIcon class="size-4" />
		Copy
	</span>
	<span
		class={cn(
			"inline-flex items-center gap-1.5 transition-[opacity,transform,filter] duration-200 ease-out motion-reduce:transition-none",
			copied
				? "opacity-100 scale-100 blur-0"
				: "pointer-events-none absolute opacity-0 scale-95 blur-[2px]",
		)}
		aria-hidden={!copied}
	>
		<CheckIcon class="size-4" weight="bold" />
		Copied
	</span>
</Button>
