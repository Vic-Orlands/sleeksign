<script lang="ts">
	import ArrowLineDown from "phosphor-svelte/lib/ArrowLineDown";
	import ListBullets from "phosphor-svelte/lib/ListBullets";
	import MagnifyingGlass from "phosphor-svelte/lib/MagnifyingGlass";
	import Plug from "phosphor-svelte/lib/Plug";
	import Sparkle from "phosphor-svelte/lib/Sparkle";
	import SquaresFour from "phosphor-svelte/lib/SquaresFour";
	import Wrench from "phosphor-svelte/lib/Wrench";
	import type { RailItem, ScanData } from "$lib/codebase-scan";

	let { data }: { data: ScanData } = $props();

	function toolIcon(label: string) {
		const normalized = label.toLowerCase();
		if (/^(search|find|query|lookup)/.test(normalized)) return MagnifyingGlass;
		if (/^(list|ls|index|all)/.test(normalized)) return ListBullets;
		if (/^(get|fetch|read|load)/.test(normalized)) return ArrowLineDown;
		return Wrench;
	}
</script>

<aside class="rail" aria-label="Scan details">
	<div class="rail-scroll">
		{#if data.topModels.length}
			<section>
				<h2><Sparkle weight="fill" />Models</h2>
				<ol>
					{#each data.topModels as item (item.id)}
						<li>
							{#if item.domain}
								<img src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`} alt="" />
							{:else}
								<Sparkle />
							{/if}
							<span>{item.label}</span>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		{#if data.topTools.length}
			<section>
				<h2><Wrench weight="fill" />Tools</h2>
				<ul>
					{#each data.topTools as item (item.id)}
						{@const Icon = toolIcon(item.label)}
						<li>
							{#if item.domain}
								<img src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`} alt="" />
							{:else}
								<Icon />
							{/if}
							<span>{item.label}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.topIntegrations.length}
			<section>
				<h2><SquaresFour weight="fill" />Integrations</h2>
				<ul>
					{#each data.topIntegrations as item (item.id)}
						<li>
							{#if item.domain}
								<img src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`} alt="" />
							{:else}
								<Plug />
							{/if}
							<span>{item.label}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</aside>

<style>
	.rail {
		display: flex;
		width: 216px;
		max-height: 46dvh;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
		border-radius: 18px;
		background: var(--card);
	}
	.rail-scroll {
		min-height: 0;
		overflow-y: auto;
		padding: 14px;
		scrollbar-width: none;
		mask-image: linear-gradient(to bottom, transparent, black 7px, black calc(100% - 14px), transparent);
	}
	.rail-scroll::-webkit-scrollbar { display: none; }
	section { margin: 2px 2px 0; }
	section + section { margin-top: 22px; }
	section:last-child { padding-bottom: 18px; }
	h2 {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0 0 10px 1px;
		color: var(--muted-foreground);
		font-size: 10px;
		font-weight: 400;
	}
	h2 :global(svg) { width: 10px; height: 10px; opacity: 0.55; }
	ul,
	ol {
		display: flex;
		margin: 0;
		padding: 0;
		flex-direction: column;
		gap: 9px;
		list-style: none;
	}
	li { display: flex; min-width: 0; align-items: center; gap: 7px; }
	li img,
	li :global(svg) {
		width: 12px;
		height: 12px;
		flex: 0 0 auto;
		border-radius: 3px;
		color: var(--muted-foreground);
	}
	li span {
		overflow: hidden;
		font-size: 12px;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
