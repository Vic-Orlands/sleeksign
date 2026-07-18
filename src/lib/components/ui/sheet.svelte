<script lang="ts">
	import type { Snippet } from "svelte";
	import { tick } from "svelte";
	import { fade, fly } from "svelte/transition";
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

	let panel = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (open) {
			tick().then(() => {
				const focusTarget = panel?.querySelector<HTMLElement>(
					'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
				);
				(focusTarget || panel)?.focus();
			});
		}
	});

	function close() {
		open = false;
		onClose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape") {
			event.preventDefault();
			close();
			return;
		}
		if (event.key !== "Tab") return;
		if (!panel) return;

		const focusable = Array.from(
			panel.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
			),
		);
		if (!focusable.length) {
			event.preventDefault();
			panel.focus();
			return;
		}

		const first = focusable[0];
		const last = focusable.at(-1);
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (open) handleKeydown(event);
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
	<div class="fixed inset-0 z-50">
		<button
			type="button"
			class="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
			aria-label="Close panel"
			onclick={close}
			in:fade={{ duration: 180 }}
			out:fade={{ duration: 140 }}
		></button>
		<div
			bind:this={panel}
			tabindex="-1"
			class={cn(
				"absolute right-0 top-0 flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-background shadow-xl outline-none",
				widthClass,
			)}
			role="dialog"
			aria-modal="true"
			aria-labelledby={labelledBy}
			in:fly={{ x: 32, duration: 220 }}
			out:fly={{ x: 24, duration: 170 }}
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
