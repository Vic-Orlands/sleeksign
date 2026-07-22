<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { toast } from "svelte-sonner";
	import Button from "$lib/components/ui/button.svelte";

	let { data } = $props();

	const packet = $derived(data.packet);
	const origin = $derived(page.url.origin);
	const signingLinks = $derived(
		packet.roleConfigs.map((role) => ({
			role: role.name,
			url: `${origin}/sign/p/${packet.document.id}?packet=${encodeURIComponent(packet.id)}&role=${encodeURIComponent(role.name)}`,
		})),
	);

	function copyToClipboard(text: string) {
		void navigator.clipboard.writeText(text);
		toast.success("Copied to clipboard!");
	}
</script>

<div class="sleek-grid flex min-h-screen items-center justify-center bg-(--paper) p-8">
	<div class="w-full max-w-2xl border border-border bg-background p-12">
		<div class="space-y-2">
			<h1 class="font-mono text-5xl font-semibold leading-none">Ready to Sign.</h1>
			<p class="font-mono text-[10px] text-muted-foreground">Secure Document Distribution v2.1</p>
		</div>

		<div class="mt-10 space-y-6">
			{#each signingLinks as link (link.role)}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<p class="font-mono text-[10px] font-bold text-primary">{link.role} signing link</p>
						<span class="bg-primary px-2 py-0.5 font-mono text-[8px] text-primary-foreground">PACKET</span>
					</div>
					<div class="flex items-center justify-between border border-primary/20 bg-primary/5 p-4">
						<code class="mr-4 truncate text-xs font-bold text-primary">{link.url}</code>
						<Button size="icon" onclick={() => copyToClipboard(link.url)}>Copy</Button>
					</div>
				</div>
			{/each}
		</div>

		<Button class="mt-10 h-12 w-full" onclick={() => goto("/docs")}>Back to Dashboard</Button>
	</div>
</div>
