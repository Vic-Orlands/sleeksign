<script lang="ts">
  import { goto } from "$app/navigation";
  import { toggleMode, mode } from "mode-watcher";
  import { getInitials } from "$lib/components/docs/types";
  import { authClient } from "$lib/auth-client";
  import Button from "$lib/components/ui/button.svelte";
  import Dialog from "$lib/components/ui/dialog.svelte";
  import DialogContent from "$lib/components/ui/dialog-content.svelte";
  import DialogDescription from "$lib/components/ui/dialog-description.svelte";
  import DialogFooter from "$lib/components/ui/dialog-footer.svelte";
  import DialogHeader from "$lib/components/ui/dialog-header.svelte";
  import DialogTitle from "$lib/components/ui/dialog-title.svelte";
  import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";

  let {
    user,
  }: {
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
  } = $props();

  let open = $state(false);
  let confirmSignOutOpen = $state(false);
  let signOutBusy = $state(false);
  let menuRef = $state<HTMLDivElement | null>(null);

  const userName = $derived(user?.name || "Signed in user");
  const userInitials = $derived(getInitials(userName));
  const isDark = $derived(mode.current === "dark");

  $effect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef?.contains(event.target as Node)) {
        open = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  });

  function toggleTheme() {
    toggleMode();
  }

  async function handleSignOut() {
    signOutBusy = true;
    try {
      open = false;
      setCurrentWorkspaceId("");
      await authClient.signOut();
      await goto("/signin");
    } finally {
      signOutBusy = false;
      confirmSignOutOpen = false;
    }
  }
</script>

<div bind:this={menuRef} class="relative">
  <button
    type="button"
    class="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <span
      class="flex size-5 items-center justify-center overflow-hidden rounded-full bg-secondary text-[11px]"
    >
      {#if user?.image}
        <img src={user.image} alt={userName} class="size-full object-cover" />
      {:else}
        {userInitials}
      {/if}
    </span>
    <span
      class="hidden max-w-[120px] truncate text-xs font-medium sm:inline"
    >
      {userName}
    </span>
  </button>

  {#if open}
    <div
      class="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-30 rounded-lg border border-border bg-popover p-1"
    >
      <button
        type="button"
        class="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
        onclick={toggleTheme}
      >
        {#if isDark}
          <svg
            class="size-4 text-muted-foreground"
            viewBox="0 0 256 256"
            fill="currentColor"
          >
            <path
              d="M128,36a92,92,0,1,0,92,92A92.1,92.1,0,0,0,128,36Zm0,168a76,76,0,1,1,76-76A76.09,76.09,0,0,1,128,204ZM255.76,68.42a8,8,0,0,1-9.84,5.58l-24-6A8,8,0,0,1,224,60.24l6-24a8,8,0,0,1,15.58,3.9l-6,24A8,8,0,0,1,255.76,68.42ZM220,108a8,8,0,0,1-6.42-3.16l-16-22.22a8,8,0,1,1,12.84-9.24l16,22.22A8,8,0,0,1,220,108Zm-9.32,48.54a8,8,0,0,1,3.16,6.42,8,8,0,0,1-3.16,6.42l-22.22,16a8,8,0,0,1-9.24-12.84l22.22-16A8,8,0,0,1,210.68,156.54ZM108,220a8,8,0,0,1-3.16-6.42,8,8,0,0,1,3.16-6.42l22.22-16a8,8,0,1,1,9.24,12.84l-22.22,16A8,8,0,0,1,108,220ZM36,128a8,8,0,0,1,6.42-3.16l24,6a8,8,0,0,1-3.9,15.58l-24-6A8,8,0,0,1,36,128ZM68.42,8.24a8,8,0,0,1,9.84,5.58l6,24a8,8,0,0,1-15.58,3.9l-6-24A8,8,0,0,1,68.42,8.24ZM60.24,32a8,8,0,0,1,3.16-6.42l22.22-16a8,8,0,1,1,9.24,12.84l-22.22,16A8,8,0,0,1,60.24,32ZM156.54,45.32a8,8,0,0,1,6.42,3.16l16,22.22a8,8,0,1,1-12.84,9.24l-16-22.22A8,8,0,0,1,156.54,45.32Z"
            />
          </svg>
          Light mode
        {:else}
          <svg
            class="size-4 text-muted-foreground"
            viewBox="0 0 256 256"
            fill="currentColor"
          >
            <path
              d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66a8,8,0,0,0,11.32-11.32l-16-16a8,8,0,0,0-11.32,11.32Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"
            />
          </svg>
          Dark mode
        {/if}
      </button>
      <button
        type="button"
        class="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-red-600 transition-colors hover:bg-red-500/10"
        onclick={() => {
          open = false;
          confirmSignOutOpen = true;
        }}
      >
        <svg
          class="size-4"
          viewBox="0 0 256 256"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M112,216a8,8,0,0,1-8,8H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h56a8,8,0,0,1,0,16H48V208h56A8,8,0,0,1,112,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L196.69,120H104a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,221.66,122.34Z"
          />
        </svg>
        Sign out
      </button>
    </div>
  {/if}
</div>

<Dialog bind:open={confirmSignOutOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Log out?</DialogTitle>
      <DialogDescription>You will return to the sign in page.</DialogDescription
      >
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onclick={() => (confirmSignOutOpen = false)}
        >Cancel</Button
      >
      <Button disabled={signOutBusy} onclick={handleSignOut}>
        {signOutBusy ? "Logging out..." : "Log out"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
