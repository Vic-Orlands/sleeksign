<script lang="ts">
  import { page } from "$app/stores";
  import { format } from "date-fns";
  import { toast } from "svelte-sonner";
  import PdfCanvasViewer from "$lib/components/pdf/PdfCanvasViewer.svelte";
  import SignatureMaker from "$lib/components/signature/SignatureMaker.svelte";
  import SignatureValue from "$lib/components/signature/SignatureValue.svelte";
  import Button from "$lib/components/ui/button.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import { valueIsComplete, type Field } from "$lib/field-utils";

  type PacketContext = {
    packetId: string;
    roleName: string;
    copyId?: string | null;
    requireOtp?: boolean;
    document: { id?: string; name: string; fileUrl: string; fields: Field[] };
    fields: Field[];
    values: Record<string, string>;
  };

  let context = $state<PacketContext | null>(null);
  let otpRequired = $state(false);
  let otpSent = $state(false);
  let otpEmail = $state("");
  let otpCode = $state("");
  let otpBusy = $state(false);
  let documentName = $state("");
  let loadError = $state<string | null>(null);
  let isLoading = $state(true);
  let isFinalizing = $state(false);
  let values = $state<Record<string, string>>({});
  let selectedField = $state<Field | null>(null);
  let isMakerOpen = $state(false);
  let finalPdfUrl = $state<string | null>(null);

  const packetId = $derived($page.params.id);
  const roleName = $derived($page.url.searchParams.get("role") || "");
  const copyId = $derived($page.url.searchParams.get("copyId") || "");

  async function loadContext() {
    if (!packetId || !roleName) return;
    isLoading = true;
    try {
      const url = `/api/public-packets/${packetId}/context?role=${encodeURIComponent(roleName)}${
        copyId ? `&copyId=${encodeURIComponent(copyId)}` : ""
      }`;
      const res = await fetch(url);
      const body = await res.json();
      if (res.status === 403 && body?.verificationRequired) {
        otpRequired = true;
        otpSent = false;
        otpCode = "";
        otpEmail = body.recipientEmail || "";
        context = null;
        if (!documentName) {
          void fetch(`/api/public-packets/${packetId}`)
            .then(async (packetRes) => {
              const packetBody = await packetRes.json();
              if (packetRes.ok) documentName = packetBody.document?.name || "";
            })
            .catch(() => undefined);
        }
        return;
      }
      if (!res.ok || body.error)
        throw new Error(body.error || "Failed to load document");
      context = body as PacketContext;
      documentName = body.document?.name || "";
      otpRequired = false;
      otpSent = false;
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "Failed to load document";
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    void loadContext();
  });

  const currentValues = $derived({ ...(context?.values || {}), ...values });
  const fields = $derived(context?.fields || []);
  const editableFields = $derived(
    fields.filter(
      (field) => field.assigneeRole === (context?.roleName || roleName),
    ),
  );
  const requiredFields = $derived(
    editableFields.filter((field) => field.required),
  );
  const allFieldsSigned = $derived(
    requiredFields.every((field) => valueIsComplete(currentValues[field.id])),
  );

  function isEditable(field: Field) {
    return field.assigneeRole === (context?.roleName || roleName);
  }

  async function sendOtp() {
    if (!otpEmail.trim()) {
      toast.error("Enter your email address");
      return;
    }
    otpBusy = true;
    try {
      const res = await fetch(`/api/public-packets/${packetId}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          roleName,
          copyId: copyId || null,
          recipientEmail: otpEmail.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to send code");
      otpSent = true;
      toast.success("Verification code sent");
    } catch {
      toast.error("Unable to send verification code");
    } finally {
      otpBusy = false;
    }
  }

  async function verifyOtp() {
    if (!otpCode.trim()) {
      toast.error("Enter the verification code");
      return;
    }
    otpBusy = true;
    try {
      const res = await fetch(`/api/public-packets/${packetId}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          roleName,
          copyId: copyId || null,
          recipientEmail: otpEmail.trim(),
          code: otpCode.trim(),
        }),
      });
      if (!res.ok) throw new Error("Invalid code");
      toast.success("Verified");
      await loadContext();
    } catch {
      toast.error("Verification failed");
    } finally {
      otpBusy = false;
    }
  }

  async function updateValue(fieldId: string, value: string) {
    values = { ...values, [fieldId]: value };
    await fetch(`/api/public-packets/${packetId}/context`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleName,
        copyId: copyId || null,
        fieldId,
        value,
      }),
    });
    toast.success("Field saved");
  }

  async function handleFieldClick(field: Field) {
    if (!isEditable(field)) {
      toast.error("This field is assigned to another signer");
      return;
    }
    if (field.type === "date") {
      await updateValue(field.id, format(new Date(), "yyyy-MM-dd"));
      return;
    }
    if (field.type === "checkbox") {
      await updateValue(
        field.id,
        currentValues[field.id] === "true" ? "false" : "true",
      );
      return;
    }
    selectedField = field;
    isMakerOpen = true;
  }

  async function finalize() {
    isFinalizing = true;
    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        body: JSON.stringify({
          packetId,
          roleName,
          copyId: copyId || null,
        }),
      });
      if (!res.ok) throw new Error("Finalize failed");
      const data = await res.json();
      finalPdfUrl = data.url;
      toast.success("Document finalized");
    } catch {
      toast.error("Failed to finalize document");
    } finally {
      isFinalizing = false;
    }
  }
</script>

{#if isLoading}
  <div class="flex h-screen items-center justify-center bg-background">
    <svg
      class="size-6 animate-spin text-primary"
      viewBox="0 0 24 24"
      fill="none"
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
  </div>
{:else if otpRequired}
  <div class="flex min-h-screen items-center justify-center bg-(--paper) p-6">
    <main
      class="grid w-full max-w-5xl overflow-hidden border border-border bg-card lg:grid-cols-[0.9fr_1.1fr]"
    >
      <section
        class="sleek-grid border-b border-border bg-background p-8 lg:border-b-0 lg:border-r"
      >
        <h1
          class="mt-6 max-w-[17rem] font-mono text-2xl font-semibold uppercase leading-tight sm:max-w-full sm:text-3xl"
        >
          Review and sign securely
        </h1>
        <p class="mt-3 max-w-md leading-7 text-muted-foreground">
          Verify your email before you can open the document and complete your
          fields.
        </p>
        {#if documentName}
          <div class="mt-8 border border-border bg-background p-4">
            <p
              class="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
            >
              Document
            </p>
            <h2 class="truncate font-semibold">{documentName}</h2>
          </div>
        {/if}
      </section>

      <form
        class="flex flex-col gap-5 p-8"
        onsubmit={(event) => {
          event.preventDefault();
          void (otpSent ? verifyOtp() : sendOtp());
        }}
      >
        <div>
          <h2 class="font-mono text-xs font-semibold uppercase tracking-widest">
            Verify your email
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Enter your email to receive a one-time code before signing as {roleName}.
          </p>
        </div>

        <label class="flex flex-col gap-1.5 text-sm">
          <span>Email address</span>
          <Input
            bind:value={otpEmail}
            type="email"
            placeholder="Recipient email"
            class="h-11"
          />
        </label>

        {#if otpSent}
          <label class="flex flex-col gap-1.5 text-sm">
            <span>Verification code</span>
            <Input
              bind:value={otpCode}
              placeholder="Enter code"
              class="h-11"
              autocomplete="one-time-code"
            />
          </label>
        {/if}

        <div class="flex flex-col items-center gap-2">
          <Button type="submit" class="h-11 w-full" loading={otpBusy}>
            {otpSent ? "Verify OTP" : "Send OTP"}
          </Button>
          {#if otpSent}
            <button
              type="button"
              class="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
              disabled={otpBusy}
              onclick={() => void sendOtp()}
            >
              Resend OTP
            </button>
          {/if}
        </div>
      </form>
    </main>
  </div>
{:else if loadError || !context}
  <div class="flex h-screen items-center justify-center bg-background">
    {loadError || "Document not found"}
  </div>
{:else if finalPdfUrl}
  <div class="flex min-h-screen items-center justify-center bg-(--paper) p-6">
    <div
      class="w-full max-w-md border border-border bg-background p-8 text-center"
    >
      <h1 class="font-mono text-xs font-semibold uppercase tracking-widest">
        Document completed
      </h1>
      <Button
        class="mt-6 w-full"
        onclick={() => window.open(finalPdfUrl!, "_blank")}
        >Download signed PDF</Button
      >
    </div>
  </div>
{:else}
  <div class="flex h-screen flex-col bg-(--paper)">
    <header
      class="flex h-14 items-center justify-between border-b border-border bg-background px-5"
    >
      <div class="min-w-0">
        <h1 class="text-lg font-cursive">SleekSign</h1>
        <p
          class="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          {context.document.name} · {context.roleName}
        </p>
      </div>
      <Button
        disabled={!allFieldsSigned}
        loading={isFinalizing}
        onclick={finalize}
      >
        Complete
      </Button>
    </header>
    <section
      class="sleek-grid min-h-0 flex-1 overflow-auto bg-zinc-100 px-6 py-8"
    >
      <PdfCanvasViewer
        fileUrl={context.document.fileUrl}
        class="mx-auto w-full max-w-[840px]"
        pageClassName="relative bg-white"
      >
        {#snippet renderOverlay(pageIndex, metrics)}
          {#each fields.filter((field) => field.page === pageIndex) as field (field.id)}
            {@const value = currentValues[field.id]}
            {@const complete = valueIsComplete(value)}
            {@const canEdit = isEditable(field)}
            {#if canEdit}
              <button
                type="button"
                class="absolute flex items-center justify-center border {complete
                  ? 'border-emerald-600 bg-emerald-50/95'
                  : 'border-blue-500/70 bg-blue-50/95'}"
                style:left="{(field.x / 100) * metrics.width}px"
                style:top="{(field.y / 100) * metrics.height}px"
                style:width="{(field.width / 100) * metrics.width}px"
                style:height="{(field.height / 100) * metrics.height}px"
                onclick={(event) => {
                  event.stopPropagation();
                  void handleFieldClick(field);
                }}
              >
                {#if complete && field.type === "signature"}
                  <SignatureValue {value} class="h-full w-full px-2 py-1" />
                {:else if complete}
                  <span class="truncate px-2 text-xs font-semibold"
                    >{value}</span
                  >
                {:else}
                  <span class="font-mono text-[10px] uppercase"
                    >{field.type}</span
                  >
                {/if}
              </button>
            {:else}
              <div
                class="pointer-events-none absolute flex items-center justify-center border {complete
                  ? 'border-zinc-300 bg-zinc-50/90'
                  : 'border-zinc-200 bg-zinc-100/80'}"
                style:left="{(field.x / 100) * metrics.width}px"
                style:top="{(field.y / 100) * metrics.height}px"
                style:width="{(field.width / 100) * metrics.width}px"
                style:height="{(field.height / 100) * metrics.height}px"
                title={`Assigned to ${field.assigneeRole}`}
              >
                {#if complete && field.type === "signature"}
                  <SignatureValue
                    {value}
                    class="h-full w-full px-2 py-1 opacity-80"
                  />
                {:else if complete}
                  <span class="truncate px-2 text-xs text-zinc-600"
                    >{value}</span
                  >
                {:else}
                  <span
                    class="font-mono text-[9px] uppercase tracking-wide text-zinc-400"
                  >
                    {field.assigneeRole}
                  </span>
                {/if}
              </div>
            {/if}
          {/each}
        {/snippet}
      </PdfCanvasViewer>
    </section>
  </div>
{/if}

<SignatureMaker
  open={isMakerOpen}
  onClose={() => (isMakerOpen = false)}
  onConfirm={async (value) => {
    if (!selectedField || !isEditable(selectedField)) return;
    await updateValue(selectedField.id, value);
    isMakerOpen = false;
  }}
  type={selectedField?.type === "text" ? "text" : "signature"}
  defaultValue={currentValues[selectedField?.id || ""] || ""}
/>
