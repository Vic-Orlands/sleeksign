<script lang="ts">
	import type { ScanNodeKind } from "$lib/codebase-scan";
	import { scanKindStyles, scanLegendGroups } from "./scan-kinds";

	let {
		kinds,
		focusKinds = $bindable(null),
	}: {
		kinds: ScanNodeKind[];
		focusKinds: ScanNodeKind[] | null;
	} = $props();
</script>

{#if kinds.length}
	<div class="share-bar" aria-label="Diagram legend">
		{#each scanLegendGroups.filter((group) => group.kinds.some((kind) => kinds.includes(kind))) as group (group.label)}
			{@const style = scanKindStyles[group.kind]}
			{@const Icon = style.icon}
			{@const active = focusKinds?.some((kind) => group.kinds.includes(kind))}
			<button
				type="button"
				class:active
				class:dimmed={focusKinds !== null && !active}
				onmouseenter={() => (focusKinds = group.kinds)}
				onmouseleave={() => (focusKinds = null)}
				onfocus={() => (focusKinds = group.kinds)}
				onblur={() => (focusKinds = null)}
			>
				<Icon weight="fill" style={`color:${style.color}`} />
				{group.label}
			</button>
		{/each}
	</div>
{/if}

<style>
	.share-bar {
		position: fixed;
		z-index: 50;
		bottom: 24px;
		left: 50%;
		display: flex;
		align-items: center;
		gap: 16px;
		transform: translateX(-50%);
		border: 1px solid color-mix(in oklab, var(--border) 55%, transparent);
		border-radius: 999px;
		background: color-mix(in oklab, var(--card) 70%, transparent);
		padding: 10px 20px;
		backdrop-filter: blur(12px);
	}
	button {
		display: flex;
		align-items: center;
		gap: 6px;
		border: 0;
		background: transparent;
		padding: 0;
		color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		transition: color 160ms ease, opacity 160ms ease;
		cursor: default;
	}
	button :global(svg) { width: 12px; height: 12px; opacity: 0.8; transition: transform 160ms ease; }
	button.active { color: var(--foreground); }
	button.active :global(svg) { transform: scale(1.1); }
	button.dimmed { opacity: 0.4; }
	@media (max-width: 680px) {
		.share-bar { width: calc(100% - 24px); justify-content: center; gap: 10px; padding-inline: 12px; }
		button { font-size: 8px; }
	}
</style>
