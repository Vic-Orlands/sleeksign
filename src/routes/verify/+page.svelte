<script lang="ts">
  import { enhance } from "$app/forms";
  import { mode, toggleMode } from "mode-watcher";
  import Input from "$lib/components/ui/input.svelte";
  import Button from "$lib/components/ui/button.svelte";
  import SiteShell from "$lib/components/marketing/site-shell.svelte";
  import { Moon, Sun, ShieldCheck, CircleNotchIcon } from "phosphor-svelte";
  import type { SubmitFunction } from "@sveltejs/kit";

  let { form } = $props();
  let verificationId = $state("");
  let submitting = $state(false);
  const isDark = $derived(mode.current === "dark");
  const handleSubmit: SubmitFunction = () => {
    submitting = true;
    return async ({ update }) => {
      await update();
      submitting = false;
    };
  };
</script>

<SiteShell>
  <section
    class="mx-auto w-full max-w-4xl h-[80vh] flex flex-col justify-center"
  >
    <div class="flex flex-col items-center text-center">
      <button
        type="button"
        class="mb-4 grid size-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        aria-label={isDark ? "Use light theme" : "Use dark theme"}
        title={isDark ? "Use light theme" : "Use dark theme"}
        onclick={toggleMode}
      >
        {#if isDark}
          <Sun class="size-3.5" aria-hidden="true" />
        {:else}
          <Moon class="size-3.5" aria-hidden="true" />
        {/if}
      </button>

      <a
        href="/"
        class="mb-10 font-cursive text-xl font-semibold leading-none text-foreground lg:text-4xl"
      >
        SleekSign
      </a>
    </div>

    <section class="flex items-center">
      <div>
        <h1
          class="max-w-2xl text-2xl font-light text-foreground sm:text-3xl lg:text-5xl tracking-tight"
        >
          Trust the file,
          <span class="font-cursive text-orange-500"> not </span>
          <br />
          the appearance.
        </h1>
        <p
          class="mt-6 w-[80%] text-xs font-light text-muted-foreground sm:text-sm"
        >
          Every finalized SleekSign PDF carries a quiet verification ID. Enter
          it to compare the exact file against its signed integrity receipt.
        </p>
      </div>

      <div class="w-full max-w-xs">
        <div
          class="grid size-10 place-items-center rounded-full border border-border bg-muted text-foreground"
        >
          <ShieldCheck class="size-6" weight="duotone" aria-hidden="true" />
        </div>
        <h2
          class="mt-5 text-left text-base font-medium tracking-tight text-foreground"
        >
          Find the integrity receipt
        </h2>
        <p
          class="mt-1.5 text-left text-sm font-light leading-6 text-muted-foreground"
        >
          The ID begins with
          <code
            class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
            >ss_</code
          >
          and appears along the bottom edge of every page.
        </p>
        <form method="POST" use:enhance={handleSubmit} class="mt-6 space-y-2">
          <label
            for="verificationId"
            class="block text-left text-[9px] font-medium tracking-[0.16em] text-muted-foreground uppercase"
          >
            Verification ID
          </label>
          <Input
            id="verificationId"
            name="verificationId"
            bind:value={verificationId}
            autocomplete="off"
            spellcheck="false"
            placeholder="ss_..."
            class="h-8 rounded-md border-border bg-background font-mono text-xs"
          />
          {#if form?.error}
            <p class="text-left text-sm text-destructive">{form.error}</p>
          {/if}
          <Button
            type="submit"
            disabled={!verificationId.trim() || submitting}
            class="w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if submitting}
              <CircleNotchIcon class="size-4 animate-spin" aria-hidden="true" />
              Checking...
            {:else}
              Continue to file check
            {/if}
          </Button>
        </form>
      </div>
    </section>
  </section>
</SiteShell>
