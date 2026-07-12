<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { toast } from "svelte-sonner";
	import Button from "$lib/components/ui/button.svelte";

	type SessionRecord = {
		id: string;
		documentId: string;
		signerName?: string | null;
	};

	let session = $state<SessionRecord | null>(null);
	let isLoading = $state(true);

	const sessionId = $derived($page.params.id);

	$effect(() => {
		const id = sessionId;
		if (!id) return;
		isLoading = true;
		void fetch(`/api/sessions?sessionId=${id}`)
			.then((res) => res.json())
			.then((data) => {
				session = data as SessionRecord;
			})
			.finally(() => {
				isLoading = false;
			});
	});

	const uniqueUrl = $derived(
		typeof window !== "undefined" && session ? `${window.location.origin}/sign/${session.id}` : "",
	);
	const publicUrl = $derived(
		typeof window !== "undefined" && session
			? `${window.location.origin}/sign/p/${session.documentId}`
			: "",
	);

	function copyToClipboard(text: string) {
		void navigator.clipboard.writeText(text);
		toast.success("Copied to clipboard!");
	}
</script>

{#if isLoading}
	<div class="flex h-screen items-center justify-center bg-background">
		<svg class="size-6 animate-spin" viewBox="0 0 24 24" fill="none">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
		</svg>
	</div>
{:else}
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
							Option 1: Unique Link (Specific to {session?.signerName || "signer"})
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
{/if}
