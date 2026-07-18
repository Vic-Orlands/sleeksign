<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/components/ui/button.svelte";
  import Input from "$lib/components/ui/input.svelte";

  let { form } = $props();
</script>

<svelte:head>
  <title>Verify a signed document - SleekSign</title>
  <meta name="description" content="Check the integrity of a document finalized by SleekSign." />
</svelte:head>

<main class="min-h-screen bg-[#f4f2ed] text-[#171714]">
  <div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-8">
    <header class="flex items-center justify-between border-b border-black/15 pb-5">
      <a href="/" class="font-cursive text-2xl font-semibold">SleekSign</a>
      <span class="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-black/50">
        Document integrity
      </span>
    </header>

    <section class="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1fr_0.8fr]">
      <div class="max-w-xl">
        <p class="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
          Independent check
        </p>
        <h1 class="mt-5 text-5xl leading-[0.95] font-medium tracking-[-0.055em] sm:text-7xl">
          Trust the file,<br />not the appearance.
        </h1>
        <p class="mt-7 max-w-lg text-[15px] leading-7 text-black/60">
          Every finalized SleekSign PDF carries a quiet verification ID. Enter it to compare the exact file against its signed integrity receipt.
        </p>
      </div>

      <div class="border border-black/15 bg-white p-6 shadow-[8px_8px_0_0_#171714] sm:p-8">
        <div class="flex size-10 items-center justify-center rounded-full border border-black/20 bg-[#f4f2ed]">
          <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path d="M12 3 4.5 6v5.2c0 4.6 3.2 8.2 7.5 9.8 4.3-1.6 7.5-5.2 7.5-9.8V6L12 3Z" />
            <path d="m8.7 12 2.1 2.1 4.6-4.7" />
          </svg>
        </div>
        <h2 class="mt-6 text-xl font-semibold tracking-[-0.025em]">Find the integrity receipt</h2>
        <p class="mt-2 text-sm leading-6 text-black/55">
          The ID begins with <code class="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">ss_</code> and appears along the bottom edge of every page.
        </p>
        <form method="POST" use:enhance class="mt-7 space-y-3">
          <label for="verificationId" class="block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">
            Verification ID
          </label>
          <Input
            id="verificationId"
            name="verificationId"
            autocomplete="off"
            spellcheck="false"
            placeholder="ss_..."
            class="h-11 rounded-none border-black/20 bg-white font-mono text-sm"
          />
          {#if form?.error}
            <p class="text-sm text-red-700">{form.error}</p>
          {/if}
          <Button type="submit" class="h-11 w-full rounded-none bg-black text-white hover:bg-black/85">
            Continue to file check
          </Button>
        </form>
      </div>
    </section>

    <footer class="border-t border-black/15 pt-5 text-xs text-black/45">
      The visible ID is a locator. Authenticity comes from the uploaded file hash, audit chain, and Google Cloud KMS signature.
    </footer>
  </div>
</main>
