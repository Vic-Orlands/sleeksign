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

<aside
	class="flex max-h-[46dvh] w-[216px] flex-col overflow-hidden rounded-[18px] border border-border/70 bg-card max-[760px]:hidden"
	aria-label="Scan details"
>
	<div
		class="rail-scroll min-h-0 overflow-y-auto p-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
	>
		{#if data.topModels.length}
			<section class="mt-0.5 mr-0.5 ml-0.5">
				<h2
					class="mb-2.5 ml-px flex items-center gap-1.5 text-[10px] font-normal text-muted-foreground"
				>
					<Sparkle weight="fill" class="size-2.5 opacity-55" />Models
				</h2>
				<ol class="m-0 flex list-none flex-col gap-2.5 p-0">
					{#each data.topModels as item (item.id)}
						<li class="flex min-w-0 items-center gap-1.5">
							{#if item.domain}
								<img
									class="size-3 shrink-0 rounded-[3px]"
									src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`}
									alt=""
								/>
							{:else}
								<Sparkle class="size-3 shrink-0 text-muted-foreground" />
							{/if}
							<span
								class="overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap"
								>{item.label}</span
							>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		{#if data.topTools.length}
			<section class={data.topModels.length ? "mt-[22px] mr-0.5 ml-0.5" : "mt-0.5 mr-0.5 ml-0.5"}>
				<h2
					class="mb-2.5 ml-px flex items-center gap-1.5 text-[10px] font-normal text-muted-foreground"
				>
					<Wrench weight="fill" class="size-2.5 opacity-55" />Tools
				</h2>
				<ul class="m-0 flex list-none flex-col gap-2.5 p-0">
					{#each data.topTools as item (item.id)}
						{@const Icon = toolIcon(item.label)}
						<li class="flex min-w-0 items-center gap-1.5">
							{#if item.domain}
								<img
									class="size-3 shrink-0 rounded-[3px]"
									src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`}
									alt=""
								/>
							{:else}
								<Icon class="size-3 shrink-0 text-muted-foreground" />
							{/if}
							<span
								class="overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap"
								>{item.label}</span
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.topIntegrations.length}
			<section
				class="mr-0.5 mb-0 ml-0.5 pb-[18px] {data.topModels.length || data.topTools.length
					? 'mt-[22px]'
					: 'mt-0.5'}"
			>
				<h2
					class="mb-2.5 ml-px flex items-center gap-1.5 text-[10px] font-normal text-muted-foreground"
				>
					<SquaresFour weight="fill" class="size-2.5 opacity-55" />Integrations
				</h2>
				<ul class="m-0 flex list-none flex-col gap-2.5 p-0">
					{#each data.topIntegrations as item (item.id)}
						<li class="flex min-w-0 items-center gap-1.5">
							{#if item.domain}
								<img
									class="size-3 shrink-0 rounded-[3px]"
									src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`}
									alt=""
								/>
							{:else}
								<Plug class="size-3 shrink-0 text-muted-foreground" />
							{/if}
							<span
								class="overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap"
								>{item.label}</span
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</aside>

<style>
	/* Fade mask at scroll edges — not expressible cleanly in Tailwind alone */
	.rail-scroll {
		mask-image: linear-gradient(
			to bottom,
			transparent,
			black 7px,
			black calc(100% - 14px),
			transparent
		);
	}
</style>
