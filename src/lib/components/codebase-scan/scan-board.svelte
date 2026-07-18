<script lang="ts">
	import CheckCircle from "phosphor-svelte/lib/CheckCircle";
	import Copy from "phosphor-svelte/lib/Copy";
	import Moon from "phosphor-svelte/lib/Moon";
	import Sun from "phosphor-svelte/lib/Sun";
	import { mode, toggleMode } from "mode-watcher";
	import { fade } from "svelte/transition";
	import type { ScanData, ScanNodeKind } from "$lib/codebase-scan";
	import FlowMap from "./flow-map.svelte";
	import LeftRail from "./left-rail.svelte";
	import { scanKindOrder } from "./scan-kinds";
	import ShareBar from "./share-bar.svelte";

	let { data }: { data: ScanData } = $props();

	let focusKinds = $state<ScanNodeKind[] | null>(null);
	let fogVisible = $state(true);
	let copied = $state(false);
	const isDark = $derived(mode.current === "dark");
	const visibleKinds = $derived(
		scanKindOrder.filter((kind) =>
			data.graph.nodes.some((item) => item.kind === kind),
		),
	);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			window.setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}
</script>

<div class="scan-board">
	<div class="left-column">
		<a href="/" class="powered-pill">
			<span>Architecture by</span>
			<strong>SleekSign</strong>
		</a>
		<LeftRail {data} />
	</div>

	<div class="scan-actions">
		<button type="button" onclick={copyLink}>
			{#if copied}
				<CheckCircle weight="fill" class="success" aria-hidden="true" />
			{:else}
				<Copy aria-hidden="true" />
			{/if}
			Copy link
		</button>
		<button
			type="button"
			class="theme-button"
			aria-label={isDark ? "Use light theme" : "Use dark theme"}
			onclick={toggleMode}
		>
			{#if isDark}<Sun aria-hidden="true" />{:else}<Moon aria-hidden="true" />{/if}
		</button>
	</div>

	<FlowMap graph={data.graph} {focusKinds} />
	<ShareBar kinds={visibleKinds} bind:focusKinds />

	{#if fogVisible}
		<div class="fog-overlay" transition:fade={{ duration: 420 }}>
			<div class="cloud cloud-left" aria-hidden="true">
				{#each Array(10) as _}<i></i>{/each}
			</div>
			<div class="cloud cloud-right" aria-hidden="true">
				{#each Array(10) as _}<i></i>{/each}
			</div>
			<div class="cloud cloud-bottom" aria-hidden="true">
				{#each Array(10) as _}<i></i>{/each}
			</div>
			<div class="reveal">
				<p>{data.project.name} · {data.graph.nodes.length} entities · {data.graph.edges.length} relationships</p>
				<button type="button" onclick={() => (fogVisible = false)}>
					View Entity-Relationship Diagram
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.scan-board {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #f5f5f5;
		color: var(--foreground);
	}
	:global(.dark) .scan-board { background: var(--background); }
	.left-column {
		position: absolute;
		z-index: 20;
		top: 24px;
		left: 24px;
		display: flex;
		width: max-content;
		flex-direction: column;
		gap: 16px;
	}
	.powered-pill {
		display: flex;
		width: max-content;
		align-items: center;
		gap: 8px;
		border-radius: 999px;
		background: var(--card);
		padding: 10px 16px;
		border: 1px solid var(--border);
		color: var(--foreground);
		text-decoration: none;
		transition: opacity 150ms ease;
	}
	.powered-pill:hover { opacity: 0.8; }
	.powered-pill span { color: var(--muted-foreground); font-size: 12px; }
	.powered-pill strong { font-size: 14px; font-weight: 650; letter-spacing: -0.02em; }
	.scan-actions {
		position: absolute;
		z-index: 20;
		top: 24px;
		right: 24px;
		display: flex;
		gap: 8px;
	}
	.scan-actions button {
		display: flex;
		height: 36px;
		align-items: center;
		justify-content: center;
		gap: 7px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--background);
		padding: 0 13px;
		color: var(--foreground);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
	}
	.scan-actions button :global(svg) { width: 15px; height: 15px; }
	.scan-actions .theme-button { width: 36px; padding: 0; }
	.scan-actions :global(.success) { color: #16a34a; }
	.fog-overlay {
		position: absolute;
		z-index: 60;
		inset: 0;
		overflow: hidden;
		background: rgb(255 255 255 / 0.05);
		backdrop-filter: blur(1px);
	}
	.cloud {
		position: absolute;
		width: 72vw;
		height: 34vh;
		filter: blur(25px);
		opacity: 0.84;
		animation: fog-drift 17s ease-in-out infinite alternate;
	}
	.cloud i {
		position: absolute;
		display: block;
		width: 30%;
		aspect-ratio: 1.8;
		border-radius: 50%;
		background: color-mix(in oklab, var(--background) 92%, white);
	}
	.cloud i:nth-child(1) { top: 38%; left: 0; }
	.cloud i:nth-child(2) { top: 14%; left: 10%; width: 36%; }
	.cloud i:nth-child(3) { top: 42%; left: 23%; width: 40%; }
	.cloud i:nth-child(4) { top: 4%; left: 38%; width: 34%; }
	.cloud i:nth-child(5) { top: 34%; left: 50%; width: 42%; }
	.cloud i:nth-child(6) { top: 10%; left: 68%; width: 31%; }
	.cloud i:nth-child(7) { top: 48%; left: 78%; width: 36%; }
	.cloud i:nth-child(8) { top: 62%; left: 22%; width: 48%; }
	.cloud i:nth-child(9) { top: 65%; left: 54%; width: 39%; }
	.cloud i:nth-child(10) { top: 66%; left: 2%; width: 43%; }
	.cloud-left { top: 4%; left: -14%; transform: rotate(-8deg); }
	.cloud-right { top: 35%; right: -16%; transform: rotate(7deg); animation-delay: -6s; }
	.cloud-bottom { bottom: -10%; left: 7%; width: 84vw; transform: rotate(-3deg); animation-delay: -11s; }
	.reveal {
		position: absolute;
		top: 50%;
		left: 50%;
		display: grid;
		justify-items: center;
		gap: 12px;
		transform: translate(-50%, -50%);
		text-align: center;
	}
	.reveal p { margin: 0; color: color-mix(in oklab, var(--foreground) 70%, transparent); font-size: 11px; font-weight: 600; }
	.reveal button {
		border: 1px solid color-mix(in oklab, var(--foreground) 20%, transparent);
		border-radius: 999px;
		background: var(--foreground);
		padding: 13px 20px;
		color: var(--background);
		font-size: 12px;
		font-weight: 650;
		cursor: pointer;
	}
	@keyframes fog-drift {
		from { translate: -2% -1%; scale: 0.98; }
		to { translate: 3% 2%; scale: 1.04; }
	}
	@media (max-width: 760px) {
		.left-column :global(.rail) { display: none; }
		.powered-pill span { display: none; }
		.scan-actions { right: 12px; }
		.left-column { left: 12px; }
		.reveal { width: calc(100% - 32px); }
	}
	@media (prefers-reduced-motion: reduce) {
		.cloud { animation: none; }
	}
</style>
