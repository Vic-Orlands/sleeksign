<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { toast } from "svelte-sonner";
	import Button from "$lib/components/ui/button.svelte";

	let { data } = $props();

	const session = $derived(data.session);
	const origin = $derived(page.url.origin);

	const uniqueUrl = $derived(`${origin}/sign/${session.id}`);
	const publicUrl = $derived(`${origin}/sign/p/${session.documentId}`);

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
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<p class="font-mono text-[10px] font-bold text-primary">
						Option 1: Unique Link (Specific to {session.signerName || "signer"})
					</p>
					<span class="border border-border px-2 py-0.5 font-mono text-[8px]">ONE-TIME USE</span>
				</div>
				<div class="flex items-center justify-between border border-border bg-background p-4">
					<code class="mr-4 truncate text-xs font-bold text-muted-foreground">{uniqueUrl}</code>
					<Button size="icon" variant="ghost" onclick={() => copyToClipboard(uniqueUrl)}>Copy</Button>
				</div>
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<p class="font-mono text-[10px] font-bold text-primary">Option 2: Public Link (Send to entire staff)</p>
					<span class="bg-primary px-2 py-0.5 font-mono text-[8px] text-primary-foreground">MULTI-USER</span>
				</div>
				<div class="flex items-center justify-between border border-primary/20 bg-primary/5 p-4">
					<code class="mr-4 truncate text-xs font-bold text-primary">{publicUrl}</code>
					<Button size="icon" onclick={() => copyToClipboard(publicUrl)}>Copy</Button>
				</div>
				<p class="font-mono text-[9px] font-medium text-muted-foreground">
					* Recommended for high-volume signing (NDAs, Employee Handbooks, etc.)
				</p>
			</div>
		</div>

		<Button class="mt-10 h-12 w-full" onclick={() => goto("/docs")}>Back to Dashboard</Button>
	</div>
</div>
