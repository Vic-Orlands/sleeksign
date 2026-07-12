<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	let {
		open = $bindable(false),
		class: className = "",
		children,
		onOpenChange,
	}: {
		open?: boolean;
		class?: string;
		children?: Snippet;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			dialogEl.showModal();
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<dialog
	bind:this={dialogEl}
	class={cn(
		"fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 backdrop:bg-background/60",
		className,
	)}
	onclose={handleClose}
	onclick={(event) => {
		if (event.target === dialogEl) handleClose();
	}}
>
	{@render children?.()}
</dialog>
