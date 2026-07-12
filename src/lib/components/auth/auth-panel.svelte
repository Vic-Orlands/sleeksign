<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { base, resolve } from "$app/paths";
	import Buildings from "phosphor-svelte/lib/Buildings";
	import CheckCircle from "phosphor-svelte/lib/CheckCircle";
	import Envelope from "phosphor-svelte/lib/Envelope";
	import FileText from "phosphor-svelte/lib/FileText";
	import Lock from "phosphor-svelte/lib/Lock";
	import User from "phosphor-svelte/lib/User";
	import { toast } from "svelte-sonner";

	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import { authClient, saveLastWorkspaceId } from "$lib/auth-client";
	import { setCurrentWorkspaceId } from "$lib/workspace-store";
	import {
		type AuthMode,
		appUrl,
		authContent,
		getSubmitLabel,
		getSubmitLoadingLabel,
		getSwitcherAction,
		getSwitcherHref,
		getSwitcherText,
		getWorkspaceRedirectPath,
	} from "./auth-utils";

	let {
		mode,
		token,
		nextPath,
	}: {
		mode: AuthMode;
		token?: string;
		nextPath?: string;
	} = $props();

	onMount(() => {
		document.body.classList.add("auth-page");
		return () => document.body.classList.remove("auth-page");
	});

	let authBusy = $state(false);
	let googleBusy = $state(false);
	let name = $state("");
	let email = $state("");
	let password = $state("");
	let newPassword = $state("");
	let workspace = $state("");

	const isSignUp = $derived(mode === "signup");
	const isSignIn = $derived(mode === "signin");
	const isForgot = $derived(mode === "forgot");
	const isReset = $derived(mode === "reset");
	const isInvitationFlow = $derived(
		Boolean(nextPath?.startsWith("/accept-invitation/")),
	);
	const content = $derived(authContent[mode]);

	function navigate(href: "/signin" | "/signup" | "/forgot-password") {
		const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
		goto(`${resolve(href)}${query}`, { noScroll: true });
	}

	async function redirectAfterAuth(
		isSignUpFlow: boolean,
		workspaceName: string,
	) {
		if (isSignUpFlow && workspaceName && nextPath) {
			if (nextPath.startsWith("/accept-invitation/")) {
				const id = nextPath.split("/").pop();
				if (id) {
					await goto(resolve("/accept-invitation/[id]", { id }));
					return;
				}
			}
			await goto(appUrl(nextPath, base));
			return;
		}

		const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
		await goto(`${resolve("/auth/workspace")}${query}`);
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const formEmail = String(formData.get("email") || email);
		const formPassword = String(formData.get("password") || password);
		const formNewPassword = String(formData.get("newPassword") || newPassword);
		const formName = String(
			formData.get("name") || name || formEmail.split("@")[0] || "SleekSign User",
		);
		const workspaceName = String(formData.get("workspace") || workspace).trim();

		authBusy = true;
		try {
			if (isForgot) {
				await authClient.requestPasswordReset({
					email: formEmail,
					redirectTo: "/reset-password",
				});
				toast.success("If this email exists, a reset link has been sent");
				navigate("/signin");
				return;
			}

			if (isReset) {
				await authClient.resetPassword({
					newPassword: formNewPassword,
					token,
				});
				toast.success("Password reset");
				navigate("/signin");
				return;
			}

			if (isSignUp) {
				await authClient.signUp.email({
					name: formName,
					email: formEmail,
					password: formPassword,
					callbackURL: getWorkspaceRedirectPath(nextPath),
				});
				if (workspaceName) {
					const organization = await authClient.organization.create({
						name: workspaceName,
						slug: workspaceName
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, "-")
							.replace(/(^-|-$)/g, ""),
					});
					if (organization?.data?.id) {
						setCurrentWorkspaceId(organization.data.id);
						await authClient.$fetch("/organization/set-active", {
							method: "POST",
							body: { organizationId: organization.data.id },
						});
						await saveLastWorkspaceId(organization.data.id);
					}
				}
			} else {
				await authClient.signIn.email({
					email: formEmail,
					password: formPassword,
					callbackURL: getWorkspaceRedirectPath(nextPath),
				});
			}

			const redirectPath =
				isSignUp && workspaceName
					? nextPath || "/docs"
					: getWorkspaceRedirectPath(nextPath);

			if (isSignUp && workspaceName && !nextPath) {
				await goto(resolve("/docs"));
			} else if (redirectPath.startsWith("/docs")) {
				await goto(resolve("/docs"));
			} else {
				await redirectAfterAuth(isSignUp, workspaceName);
			}
		} catch {
			toast.error(isSignUp ? "Sign up failed" : "Sign in failed");
		} finally {
			authBusy = false;
		}
	}

	async function signInWithGoogle() {
		googleBusy = true;
		try {
			await authClient.signIn.social({
				provider: "google",
				callbackURL: getWorkspaceRedirectPath(nextPath),
			});
		} catch {
			toast.error("Google sign in is not configured yet");
		} finally {
			googleBusy = false;
		}
	}
</script>

<main
	class="grid min-h-svh bg-(--paper) text-foreground lg:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)]"
>
	<section
		class="hidden border-r border-border bg-background p-8 lg:flex lg:flex-col"
		style="view-transition-name: auth-aside"
	>
		<a href={resolve("/")} style="view-transition-name: auth-brand">
			<div class="flex items-center gap-2">
				<span class="font-cursive text-3xl text-foreground">SleekSign</span>
			</div>
		</a>

		<div class="mt-auto max-w-xl">
			<p
				class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
				style="view-transition-name: auth-aside-eyebrow"
			>
				Document Operations
			</p>
			<h1
				class="mt-4 text-4xl font-semibold tracking-normal text-foreground"
				style="view-transition-name: auth-aside-title"
			>
				<span class="text-orange-400">Prepare,</span>
				<span class="text-orange-400">send,</span>
				<span class="text-orange-400">sign,</span>
				and
				<span class="text-orange-400">review</span>
				documents from one focused workspace.
			</h1>
			<div
				class="mt-8 flex flex-col -space-y-px"
				style="view-transition-name: auth-aside-features"
			>
				<div
					class="flex items-center gap-3 border border-border p-3 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
				>
					<FileText class="size-4 shrink-0 text-foreground" weight="regular" />
					<span>Edited documents stay separate from untouched uploads</span>
				</div>
				<div
					class="flex items-center gap-3 border border-border p-3 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
				>
					<CheckCircle class="size-4 shrink-0 text-foreground" weight="regular" />
					<span>Signed documents are reviewable before download</span>
				</div>
				<div
					class="flex items-center gap-3 border border-border p-3 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
				>
					<Buildings class="size-4 shrink-0 text-foreground" weight="regular" />
					<span>Workspace switching keeps teams in context</span>
				</div>
			</div>
		</div>
	</section>

	<section class="flex min-h-svh items-center justify-center px-4 py-8 sm:px-6">
		<div class="w-full max-w-sm" style="view-transition-name: auth-card">
			<div class="lg:hidden">
				<div class="flex items-center gap-2" style="view-transition-name: auth-brand-mobile">
					<span class="font-cursive text-xl">SleekSign</span>
				</div>
			</div>

			<div class="mt-8 sm:mt-0">
				<p
					class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
					style="view-transition-name: auth-eyebrow"
				>
					{content.eyebrow}
				</p>
				<h2
					class="mt-3 text-2xl font-semibold tracking-normal"
					style="view-transition-name: auth-title"
				>
					{content.title}
				</h2>
				<p
					class="mt-2 text-sm text-muted-foreground"
					style="view-transition-name: auth-copy"
				>
					{content.copy}
				</p>
			</div>

			<form class="mt-6 flex flex-col gap-3" onsubmit={submit}>
				{#if isSignUp}
					<label class="grid gap-1.5" style="view-transition-name: auth-name">
						<span
							class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Full name
						</span>
						<span class="relative block">
							<User
								class="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
								weight="regular"
							/>
							<Input
								class="h-9 pl-9"
								type="text"
								name="name"
								autocomplete="name"
								placeholder="Alex Kim"
								bind:value={name}
								required
							/>
						</span>
					</label>
				{/if}

				{#if !isReset}
					<label class="grid gap-1.5" style="view-transition-name: auth-email">
						<span
							class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Email
						</span>
						<span class="relative block">
							<Envelope
								class="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
								weight="regular"
							/>
							<Input
								class="h-9 pl-9"
								type="email"
								name="email"
								autocomplete="email"
								placeholder="alex@company.com"
								bind:value={email}
								required
							/>
						</span>
					</label>
				{/if}

				{#if isSignIn || isSignUp}
					<label class="grid gap-1.5" style="view-transition-name: auth-password">
						<span
							class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Password
						</span>
						<span class="relative block">
							<Lock
								class="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
								weight="regular"
							/>
							<Input
								class="h-9 pl-9"
								type="password"
								name="password"
								autocomplete={isSignUp ? "new-password" : "current-password"}
								placeholder="Password"
								bind:value={password}
								required
							/>
						</span>
					</label>
				{/if}

				{#if isReset}
					<label class="grid gap-1.5" style="view-transition-name: auth-password">
						<span
							class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							New Password
						</span>
						<span class="relative block">
							<Lock
								class="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
								weight="regular"
							/>
							<Input
								class="h-9 pl-9"
								type="password"
								name="newPassword"
								autocomplete="new-password"
								placeholder="New password"
								bind:value={newPassword}
								required
							/>
						</span>
					</label>
				{/if}

				{#if isSignIn}
					<button
						type="button"
						class="-mt-1 self-end font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
						style="view-transition-name: auth-forgot"
						onclick={() => navigate("/forgot-password")}
					>
						Forgot Password?
					</button>
				{/if}

				{#if isSignUp}
					<label class="grid gap-1.5" style="view-transition-name: auth-workspace">
						<span
							class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Workspace
						</span>
						<span class="relative block">
							<Buildings
								class="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
								weight="regular"
							/>
							<Input
								class="h-9 pl-9"
								type="text"
								name="workspace"
								autocomplete="organization"
								placeholder={isInvitationFlow
									? "Optional workspace name"
									: "Any Workspace"}
								bind:value={workspace}
								required={!isInvitationFlow}
							/>
						</span>
					</label>
				{/if}

				<div class="mt-2" style="view-transition-name: auth-submit">
					<Button
						class="w-full"
						type="submit"
						loading={authBusy}
						loadingText={getSubmitLoadingLabel(mode)}
					>
						{getSubmitLabel(mode)}
					</Button>
				</div>
			</form>

			{#if isSignIn || isSignUp}
				<div style="view-transition-name: auth-oauth">
					<div class="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
						<span class="h-px bg-border"></span>
						<span
							class="font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
						>
							or
						</span>
						<span class="h-px bg-border"></span>
					</div>

					<Button
						variant="outline"
						class="w-full gap-2"
						onclick={signInWithGoogle}
						loading={googleBusy}
						loadingText="Connecting..."
					>
						<span class="text-[12px] font-bold normal-case tracking-normal">G</span>
						Continue with Google
					</Button>
				</div>
			{/if}

			<div
				class="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground"
				style="view-transition-name: auth-switcher"
			>
				<span>{getSwitcherText(mode)}</span>
				<button
					type="button"
					class="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:text-muted-foreground"
					onclick={() => {
						const href = getSwitcherHref(mode);
						if (href === "/signin" || href === "/signup") {
							navigate(href);
						}
					}}
				>
					{getSwitcherAction(mode)}
				</button>
			</div>
		</div>
	</section>
</main>
