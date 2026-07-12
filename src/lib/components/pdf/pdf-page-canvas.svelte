<script lang="ts">
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";
	import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
	import type { PageMetrics } from "./PdfCanvasViewer.svelte";

	let {
		pdf,
		pageIndex,
		targetWidth,
		pageClassName = "",
		onPageClick,
		renderOverlay,
		onVisiblePageChange,
	}: {
		pdf: PDFDocumentProxy;
		pageIndex: number;
		targetWidth: number;
		pageClassName?: string;
		onPageClick?: (pageIndex: number, point: { x: number; y: number }) => void;
		renderOverlay?: Snippet<[pageIndex: number, metrics: PageMetrics]>;
		onVisiblePageChange?: (pageIndex: number) => void;
	} = $props();

	let pageEl = $state<HTMLDivElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let metrics = $state<PageMetrics | null>(null);
	let shouldRender = $state(pageIndex === 0);

	$effect(() => {
		let cancelled = false;

		async function loadMetrics() {
			const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
			if (cancelled) return;

			const baseViewport = page.getViewport({ scale: 1 });
			const scale = targetWidth / baseViewport.width;
			const viewport = page.getViewport({ scale });
			metrics = {
				width: viewport.width,
				height: viewport.height,
				scale,
			};
		}

		void loadMetrics();
		return () => {
			cancelled = true;
		};
	});

	onMount(() => {
		const node = pageEl;
		if (!node) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) shouldRender = true;
					if (entry.intersectionRatio >= 0.55) onVisiblePageChange?.(pageIndex);
				}
			},
			{ rootMargin: "1200px 0px", threshold: [0, 0.55] },
		);

		observer.observe(node);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (!metrics || !shouldRender) return;

		let cancelled = false;
		let renderTask: RenderTask | null = null;
		const nextMetrics = metrics;

		async function renderPage() {
			const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
			if (cancelled) return;

			const viewport = page.getViewport({ scale: nextMetrics.scale });
			const canvas = canvasEl;
			const context = canvas?.getContext("2d");
			if (!canvas || !context) return;

			const ratio = window.devicePixelRatio || 1;
			canvas.width = Math.floor(viewport.width * ratio);
			canvas.height = Math.floor(viewport.height * ratio);
			canvas.style.width = `${viewport.width}px`;
			canvas.style.height = `${viewport.height}px`;
			context.setTransform(ratio, 0, 0, ratio, 0, 0);

			renderTask = page.render({ canvasContext: context, viewport });
			await renderTask.promise;
		}

		void renderPage();
		return () => {
			cancelled = true;
			renderTask?.cancel();
		};
	});

	function handleOverlayClick(event: MouseEvent) {
		if (!onPageClick || event.target !== event.currentTarget || !metrics) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		onPageClick(pageIndex, {
			x: ((event.clientX - rect.left) / rect.width) * 100,
			y: ((event.clientY - rect.top) / rect.height) * 100,
		});
	}
</script>

<div
	bind:this={pageEl}
	class="relative {pageClassName}"
	data-pdf-page={pageIndex}
	style:width="{metrics?.width ?? targetWidth}px"
	style:height="{metrics?.height ?? Math.max(targetWidth * 1.3, 420)}px"
>
	<canvas bind:this={canvasEl} class="block bg-white"></canvas>
	{#if !shouldRender}
		<div class="absolute inset-0 flex items-center justify-center bg-white/65 text-muted-foreground">
			<svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
				/>
			</svg>
		</div>
	{/if}
	{#if metrics && shouldRender}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="absolute inset-0" onclick={handleOverlayClick}>
			{@render renderOverlay?.(pageIndex, metrics)}
		</div>
	{/if}
	<div
		class="absolute -left-12 top-0 rounded-md border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground"
	>
		{pageIndex + 1}
	</div>
</div>
