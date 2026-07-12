<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { toast } from "svelte-sonner";
	import Button from "$lib/components/ui/button.svelte";
	import { authClient } from "$lib/auth-client";

	let { invitationId }: { invitationId: string } = $props();

	let status = $state<"idle" | "loading" | "success" | "error">("idle");

	onMount(() => {
		document.body.classList.add("auth-page");
		return () => document.body.classList.remove("auth-page");
	});

	async function acceptInvitation() {
		status = "loading";

		try {
			await authClient.$fetch("/organization/accept-invitation", {
				method: "POST",
				body: { invitationId },
			});

			status = "success";
			toast.success("Workspace invitation accepted");
			await goto(resolve("/docs"), { replaceState: true });
		} catch {
			status = "error";
			toast.error("Unable to accept this invitation");
		}
	}
</script>

<main
	class="flex min-h-svh items-center justify-center bg-(--paper) px-4 py-8 text-foreground"
>
	<div class="w-full max-w-md border border-border bg-background p-6">
		<div class="flex items-center gap-2">
			<span class="font-cursive text-xl">SleekSign</span>
		</div>

		<div class="mt-8">
			<p
				class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
			>
				Workspace Invitation
			</p>
			<h1 class="mt-3 text-2xl font-semibold tracking-normal">
				{status === "error"
					? "This invitation needs attention"
					: "Join workspace"}
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				{status === "error"
					? "The invitation may be expired, already used, or tied to a different account."
					: "Accept this invitation to connect your account to the invited workspace."}
			</p>
		</div>

		<div class="mt-6 border border-border bg-card p-4">
			<div class="flex items-center gap-3">
				{#if status === "loading"}
					<svg
						class="size-5 animate-spin text-muted-foreground"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
					>
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						/>
					</svg>
				{:else if status === "success"}
					<svg
						class="size-5 text-emerald-500"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14.2l-4.2-4.2 1.4-1.4 2.8 2.8 5.8-5.8 1.4 1.4-7.2 7.2z" />
					</svg>
				{:else}
					<svg
						class="size-5 text-muted-foreground"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M3 21V9l9-6 9 6v12H3zm2-2h14V10.2l-7-4.67-7 4.67V19zm4-2h6v-6H9v6z" />
					</svg>
				{/if}
				<div>
					<p class="text-sm font-medium">
						{status === "loading"
							? "Accepting invitation"
							: status === "success"
								? "Workspace joined"
								: "Invitation ready"}
					</p>
					<p class="text-xs text-muted-foreground">
						{status === "error"
							? "Try signing in with the invited email address."
							: "You will be taken into Documents after the workspace is ready."}
					</p>
				</div>
			</div>
		</div>

		{#if status !== "error"}
			<Button
				class="mt-6 w-full"
				loading={status === "loading"}
				loadingText="Accepting..."
				onclick={acceptInvitation}
			>
				Accept Invitation
			</Button>
		{/if}

		{#if status === "error"}
			<div class="mt-6 flex gap-2">
				<Button
					class="flex-1"
					onclick={() =>
						goto(
							`${resolve("/signin")}?next=${encodeURIComponent(`/accept-invitation/${invitationId}`)}`,
						)}
				>
					Sign In Again
				</Button>
				<Button
					variant="outline"
					class="flex-1"
					onclick={() =>
						goto(
							`${resolve("/signup")}?next=${encodeURIComponent(`/accept-invitation/${invitationId}`)}`,
						)}
				>
					Create Account
				</Button>
			</div>
		{/if}
	</div>
</main>
