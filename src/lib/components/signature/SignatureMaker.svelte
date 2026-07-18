<script lang="ts">
	import type SignaturePad from "signature_pad";
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

	let activeTab = $state<"type" | "draw" | "upload" | "text">("type");
	let name = $state("");
	let textValue = $state("");
	let typedPreviewUrl = $state("");
	let isConfirming = $state(false);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let pad = $state<SignaturePad | null>(null);
	let drawHasContent = $state(false);
	let wasOpen = $state(false);

	function isImageDataUrl(value: string) {
		return value.startsWith("data:image");
	}

	function plainTextOrEmpty(value: string) {
		return isImageDataUrl(value) ? "" : value;
	}

	$effect(() => {
		const isOpen = open;
		if (isOpen && !wasOpen) {
			activeTab = type === "text" ? "text" : "type";
			name = type === "signature" ? plainTextOrEmpty(defaultValue) : "";
			textValue = type === "text" ? plainTextOrEmpty(defaultValue) : "";
			typedPreviewUrl =
				type === "signature" && isImageDataUrl(defaultValue) ? defaultValue : "";
			drawHasContent = false;
		}
		wasOpen = isOpen;
	});

	$effect(() => {
		if (!open || type !== "signature" || activeTab !== "draw" || !canvasEl) return;
		const canvas = canvasEl;
		let disposed = false;
		let instance: SignaturePad | null = null;
		let onEnd: (() => void) | null = null;

		void import("signature_pad").then(({ default: SignaturePadConstructor }) => {
			if (disposed) return;
			instance = new SignaturePadConstructor(canvas, {
				penColor: "black",
				minWidth: 1.5,
				maxWidth: 4,
			});
			pad = instance;
			onEnd = () => {
				drawHasContent = !instance?.isEmpty();
			};
			instance.addEventListener("endStroke", onEnd);
		});

		return () => {
			disposed = true;
			if (instance && onEnd) instance.removeEventListener("endStroke", onEnd);
			instance?.off();
			if (pad === instance) pad = null;
		};
	});

	$effect(() => {
		if (!open || type !== "signature" || activeTab !== "type") return;

		if (!name.trim()) {
			typedPreviewUrl = isImageDataUrl(defaultValue) ? defaultValue : "";
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

		try {
			if (type === "text") {
				value = textValue.trim();
			} else if (activeTab === "type" && typedPreviewUrl) {
				value = typedPreviewUrl;
			} else if (activeTab === "draw" && pad && !pad.isEmpty()) {
				value = pad.toDataURL("image/png");
			}

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
		type === "text"
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
				<Input bind:value={textValue} placeholder="Enter details..." autocomplete="name" />
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
						onclick={() => (activeTab = tab.id as "type" | "draw" | "upload")}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			{#if activeTab === "type"}
				<div class="space-y-4 py-4">
					<Input bind:value={name} placeholder="Type your name..." autocomplete="name" />
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
