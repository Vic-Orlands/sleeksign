<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils";

	let {
		open = $bindable(false),
		widthClass = "w-[min(100vw,36rem)]",
		hideCloseButton = false,
		labelledBy,
		children,
		onClose,
	}: {
		open?: boolean;
		widthClass?: string;
		hideCloseButton?: boolean;
		labelledBy?: string;
		children?: Snippet;
		onClose?: () => void;
	} = $props();

	function close() {
		open = false;
		onClose?.();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50"
		role="dialog"
		aria-modal="true"
		aria-labelledby={labelledBy}
	>
		<button
			type="button"
			class="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
			aria-label="Close panel"
			onclick={close}
		></button>
		<div
			class={cn(
				"absolute right-0 top-0 flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-background shadow-xl",
				widthClass,
			)}
		>
			{#if !hideCloseButton}
				<button
					type="button"
					class="absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-md hover:bg-muted"
					aria-label="Close"
					onclick={close}
				>
					×
				</button>
			{/if}
			{@render children?.()}
		</div>
	</div>
{/if}
