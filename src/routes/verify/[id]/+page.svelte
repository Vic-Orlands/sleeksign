<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/components/ui/button.svelte";

  let { data, form } = $props();
  let fileName = $state("");
  let checking = $state(false);

  const failureCopy = $derived.by(() => {
    if (!form?.result) return null;
    if (form.result === "document_mismatch") return "This file does not match the finalized PDF recorded by SleekSign.";
    if (form.result === "revoked") return "This integrity receipt has been revoked by its issuing workspace.";
    if (form.result === "invalid_signature" || form.result === "invalid_receipt" || form.result === "invalid_audit_chain") return "The integrity receipt could not be authenticated.";
    if (form.result === "file_too_large") return "The PDF must be 25 MB or smaller.";
    if (form.result === "invalid_pdf") return "Choose a valid PDF document.";
    if (form.result === "missing_file") return "Choose the signed PDF you want to check.";
    if (form.result === "unavailable") return "Verification is temporarily unavailable. The document has not been marked invalid.";
    if (form.result === "not_found") return "No SleekSign integrity receipt was found for this ID.";
    return null;
  });
</script>

<svelte:head>
  <title>Document verification - SleekSign</title>
  <meta name="description" content="Verify the integrity of a finalized SleekSign PDF." />
</svelte:head>

<main class="min-h-screen bg-[#f4f2ed] text-[#171714]">
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-6 sm:px-8 sm:py-8">
    <header class="flex items-center justify-between border-b border-black/15 pb-5">
      <a href="/" class="font-cursive text-2xl font-semibold">SleekSign</a>
      <a href="/verify" class="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50 hover:text-black">
        Check another ID
      </a>
    </header>

    <section class="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-14">
      <div class="flex items-center gap-3">
        <span class="h-px w-10 bg-black/25"></span>
        <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">Integrity receipt</p>
      </div>
      <h1 class="mt-5 text-4xl font-medium tracking-[-0.045em] sm:text-6xl">Verify the exact PDF.</h1>
      <p class="mt-4 max-w-xl text-sm leading-6 text-black/55">
        SleekSign checks the complete file, the sealed audit chain, and the signature produced by Google Cloud KMS. The verification ID alone is not proof.
      </p>

      <div class="mt-10 border border-black/15 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div>
            <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Verification ID</p>
            <p class="mt-1 break-all font-mono text-xs font-semibold">{data.verificationId}</p>
          </div>
          <span class="rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] {data.found && data.status === 'active' ? 'border-emerald-700/25 bg-emerald-50 text-emerald-800' : 'border-red-700/25 bg-red-50 text-red-800'}">
            {data.found && data.status === "active" ? "Receipt located" : "Receipt unavailable"}
          </span>
        </div>

        {#if !data.found}
          <div class="p-6 sm:p-8">
            <h2 class="text-xl font-semibold">No matching receipt</h2>
            <p class="mt-2 text-sm leading-6 text-black/55">Check the ID printed along the bottom edge of the document.</p>
          </div>
        {:else if form?.result === "valid"}
          <div class="p-6 sm:p-8">
            <div class="flex size-12 items-center justify-center rounded-full bg-emerald-700 text-white">
              <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            </div>
            <p class="mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">Authentic document</p>
            <h2 class="mt-2 text-2xl font-semibold tracking-[-0.025em]">{form.documentName}</h2>
            <p class="mt-3 text-sm leading-6 text-black/55">The uploaded bytes match the finalized SleekSign record, and its signed manifest and audit chain are intact.</p>
            <dl class="mt-7 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2">
              <div class="bg-white p-4"><dt class="font-mono text-[9px] uppercase tracking-[0.14em] text-black/45">Finalized</dt><dd class="mt-1 text-xs">{new Date(form.finalizedAt).toLocaleString()}</dd></div>
              <div class="bg-white p-4"><dt class="font-mono text-[9px] uppercase tracking-[0.14em] text-black/45">Sealed audit events</dt><dd class="mt-1 text-xs">{form.auditEventCount}</dd></div>
              <div class="bg-white p-4"><dt class="font-mono text-[9px] uppercase tracking-[0.14em] text-black/45">Signature</dt><dd class="mt-1 text-xs">{form.signatureAlgorithm}</dd></div>
              <div class="bg-white p-4"><dt class="font-mono text-[9px] uppercase tracking-[0.14em] text-black/45">Key fingerprint</dt><dd class="mt-1 font-mono text-xs">{form.keyFingerprint}...</dd></div>
            </dl>
          </div>
        {:else}
          <form
            method="POST"
            enctype="multipart/form-data"
            use:enhance={() => {
              checking = true;
              return async ({ update }) => {
                await update({ reset: false });
                checking = false;
              };
            }}
            class="p-6 sm:p-8"
          >
            <label class="group flex min-h-48 cursor-pointer flex-col items-center justify-center border border-dashed border-black/25 bg-[#faf9f6] p-6 text-center transition hover:border-black/50 hover:bg-white">
              <input
                type="file"
                name="document"
                accept="application/pdf,.pdf"
                required
                class="sr-only"
                onchange={(event) => (fileName = event.currentTarget.files?.[0]?.name || "")}
              />
              <span class="flex size-10 items-center justify-center rounded-full border border-black/15 bg-white">
                <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>
              </span>
              <span class="mt-4 text-sm font-semibold">{fileName || "Choose the finalized PDF"}</span>
              <span class="mt-1 text-xs text-black/45">PDF only, up to 25 MB</span>
            </label>
            {#if failureCopy}
              <div class="mt-4 border border-red-800/20 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">{failureCopy}</div>
            {/if}
            <Button type="submit" loading={checking} loadingText="Checking cryptographic receipt..." class="mt-4 h-11 w-full rounded-none bg-black text-white hover:bg-black/85">
              Verify this document
            </Button>
          </form>
        {/if}
      </div>
      <p class="mt-5 text-xs leading-5 text-black/40">Personal signer details and the full chain of custody are available only to authorized members of the issuing workspace.</p>
    </section>
  </div>
</main>
