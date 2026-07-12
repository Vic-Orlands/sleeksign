<script lang="ts">
	import { onMount } from "svelte";
	import SignaturePad from "signature_pad";
	import Dialog from "$lib/components/ui/dialog.svelte";
	import DialogContent from "$lib/components/ui/dialog-content.svelte";
	import DialogHeader from "$lib/components/ui/dialog-header.svelte";
	import DialogTitle from "$lib/components/ui/dialog-title.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";

	let {
		open = false,
		onClose,
		onConfirm,
		type = "signature",
		defaultValue = "",
		textSuggestions = [],
	}: {
		open?: boolean;
		onClose: () => void;
		onConfirm: (value: string) => void | Promise<void>;
		type?: "signature" | "text";
		defaultValue?: string;
		textSuggestions?: Array<{ label: string; value: string }>;
	} = $props();

	let activeTab = $state(type === "text" ? "text" : "type");
	let name = $state(defaultValue.startsWith("data:image") ? "" : defaultValue);
	let textValue = $state(defaultValue);
	let typedPreviewUrl = $state(defaultValue.startsWith("data:image") ? defaultValue : "");
	let isConfirming = $state(false);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let pad = $state<SignaturePad | null>(null);
	let drawHasContent = $state(false);

	onMount(() => {
		return () => pad?.off();
	});

	$effect(() => {
		if (!open || activeTab !== "draw" || !canvasEl) return;
		const instance = new SignaturePad(canvasEl, {
			penColor: "black",
			minWidth: 1.5,
			maxWidth: 4,
		});
		pad = instance;
		const onEnd = () => {
			drawHasContent = !instance.isEmpty();
		};
		instance.addEventListener("endStroke", onEnd);
		return () => {
			instance.removeEventListener("endStroke", onEnd);
			instance.off();
			pad = null;
		};
	});

	$effect(() => {
		if (activeTab !== "type" || !name.trim()) {
			typedPreviewUrl = defaultValue.startsWith("data:image") ? defaultValue : "";
			return;
		}

		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		if (!context) return;

		const fontSize = 72;
		context.font = `${fontSize}px "Segoe Script", "Brush Script MT", cursive`;
		const metrics = context.measureText(name.trim());
		canvas.width = Math.max(Math.ceil(metrics.width + 40), 320);
		canvas.height = 160;
		const draw = canvas.getContext("2d");
		if (!draw) return;
		draw.font = `${fontSize}px "Segoe Script", "Brush Script MT", cursive`;
		draw.fillStyle = "#111";
		draw.fillText(name.trim(), 20, 100);
		typedPreviewUrl = canvas.toDataURL("image/png");
	});

	async function handleConfirm() {
		isConfirming = true;
		let value = "";

		if (activeTab === "text") value = textValue.trim();
		else if (activeTab === "type" && typedPreviewUrl) value = typedPreviewUrl;
		else if (activeTab === "draw" && pad && !pad.isEmpty()) value = pad.toDataURL("image/png");

		try {
			if (value) await onConfirm(value);
			onClose();
		} finally {
			isConfirming = false;
		}
	}

	function handleUpload(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onloadend = () => {
			void onConfirm(String(reader.result));
			onClose();
		};
		reader.readAsDataURL(file);
	}

	const canConfirm = $derived(
		activeTab === "text"
			? textValue.trim().length > 0
			: activeTab === "type"
				? Boolean(typedPreviewUrl)
				: activeTab === "draw"
					? drawHasContent
					: false,
	);
</script>

<Dialog {open} onOpenChange={(next) => !next && onClose()}>
	<DialogContent class="max-w-lg">
		<DialogHeader>
			<DialogTitle>{type === "text" ? "Input Text" : "Signature Maker"}</DialogTitle>
		</DialogHeader>

		{#if type === "text"}
			<div class="space-y-4 py-2">
				{#each textSuggestions as suggestion (suggestion.label)}
					<button
						type="button"
						class="w-full border border-border bg-muted/30 p-3 text-left hover:bg-muted"
						onclick={() => (textValue = suggestion.value)}
					>
						<span class="block text-[10px] uppercase text-muted-foreground">{suggestion.label}</span>
						<span class="mt-1 block truncate text-sm font-medium">{suggestion.value}</span>
					</button>
				{/each}
				<Input bind:value={textValue} placeholder="Enter details..." />
			</div>
		{:else}
			<div class="flex gap-2 border-b border-border pb-3">
				{#each [
					{ id: "type", label: "Type" },
					{ id: "draw", label: "Draw" },
					{ id: "upload", label: "Upload" },
				] as tab (tab.id)}
					<button
						type="button"
						class="rounded-md px-3 py-1.5 text-xs {activeTab === tab.id
							? 'bg-primary text-primary-foreground'
							: 'bg-muted text-muted-foreground'}"
						onclick={() => (activeTab = tab.id)}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			{#if activeTab === "type"}
				<div class="space-y-4 py-4">
					<Input bind:value={name} placeholder="Type your name..." />
					{#if typedPreviewUrl}
						<img src={typedPreviewUrl} alt="Signature preview" class="mx-auto max-h-32" />
					{/if}
				</div>
			{:else if activeTab === "draw"}
				<div class="py-4">
					<canvas bind:this={canvasEl} class="h-[240px] w-full touch-none border border-border bg-white"></canvas>
					<Button
						variant="ghost"
						size="sm"
						class="mt-2 text-destructive"
						onclick={() => {
							pad?.clear();
							drawHasContent = false;
						}}
					>
						Clear canvas
					</Button>
				</div>
			{:else}
				<div class="py-8 text-center">
					<label class="inline-flex cursor-pointer flex-col items-center gap-2 border border-dashed border-border p-8">
						<span class="text-sm font-medium">Upload signature image</span>
						<input type="file" accept="image/*" class="hidden" onchange={handleUpload} />
					</label>
				</div>
			{/if}
		{/if}

		<div class="flex justify-end gap-2 border-t border-border pt-4">
			<Button variant="outline" onclick={onClose}>Cancel</Button>
			<Button disabled={!canConfirm} loading={isConfirming} loadingText="Saving..." onclick={handleConfirm}>
				Confirm
			</Button>
		</div>
	</DialogContent>
</Dialog>
