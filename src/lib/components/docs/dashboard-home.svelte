<script lang="ts">
  import { format } from "date-fns";
  import StatusBadge from "$lib/components/docs/status-badge.svelte";
  import type {
    DocumentRecord,
    DocumentSetupStatus,
  } from "$lib/components/docs/types";
  import {
    getDocumentCounts,
    getDocumentSetupStatus,
    getDocumentType,
  } from "$lib/components/docs/types";
  import Button from "$lib/components/ui/button.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import Skeleton from "$lib/components/ui/skeleton.svelte";
  import { cn } from "$lib/utils";
  import {
    FunnelSimpleIcon,
    MagnifyingGlassIcon,
    UploadSimpleIcon,
    CaretDownIcon,
    ArrowCounterClockwiseIcon,
    TrashIcon,
    ArchiveIcon,
  } from "phosphor-svelte";

  export type DashboardFilter =
    | "all"
    | "archived"
    | "shared"
    | DocumentSetupStatus;

  const FILTER_OPTIONS: Array<{ value: DashboardFilter; label: string }> = [
    { value: "all", label: "All documents" },
    { value: "Needs Setup", label: "Needs setup" },
    { value: "Edited", label: "Ready" },
    { value: "archived", label: "Archived" },
  ];

  let {
    filteredDocuments,
    tableFilter,
    onFilterChange,
    query = $bindable(""),
    onQueryChange,
    onUpload,
    workspaceId,
    isInitialLoading,
    onSelectDocument,
    onOverviewDocument,
    onDeleteDocument,
    onArchiveDocument,
    onRestoreDocument,
    pageTitle = "Documents",
  }: {
    filteredDocuments: DocumentRecord[];
    tableFilter: DashboardFilter;
    onFilterChange: (filter: DashboardFilter) => void;
    query?: string;
    onQueryChange?: (query: string) => void;
    onUpload: (file: File) => void;
    workspaceId: string | null;
    isInitialLoading: boolean;
    onSelectDocument: (document: DocumentRecord) => void;
    onOverviewDocument?: (document: DocumentRecord) => void;
    onDeleteDocument?: (document: DocumentRecord) => void;
    onArchiveDocument?: (document: DocumentRecord) => void;
    onRestoreDocument?: (document: DocumentRecord) => void;
    pageTitle?: string;
  } = $props();

  let fileInputEl = $state<HTMLInputElement | null>(null);
  let filterOpen = $state(false);
  let filterRef = $state<HTMLDivElement | null>(null);

  const resolvedTitle = $derived(
    pageTitle ||
      (tableFilter === "shared"
        ? "Shared activity"
        : tableFilter === "archived"
          ? "Archived documents"
          : "Documents"),
  );

  const activeFilterLabel = $derived(
    FILTER_OPTIONS.find((option) => option.value === tableFilter)?.label ||
      "All documents",
  );

  const variant = $derived(tableFilter === "shared" ? "shared" : "documents");
  const showActions = $derived(
    Boolean(
      onOverviewDocument ||
        onDeleteDocument ||
        onArchiveDocument ||
        onRestoreDocument,
    ),
  );

  const columns = $derived(
    variant === "shared"
      ? ["Name", "Status", "Signatures", "Date uploaded", ""]
      : ["Name", "Type", "Status", "Fields", "Date uploaded", ""],
  );

  const emptyMessage = $derived(
    !workspaceId
      ? "Select a workspace to view documents."
      : "No documents found.",
  );

  function handleFile(file?: File) {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return;
    onUpload(file);
  }

  function handleQueryInput(value: string) {
    query = value;
    onQueryChange?.(value);
  }

  $effect(() => {
    if (!filterOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!filterRef?.contains(event.target as Node)) {
        filterOpen = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  });
</script>

<main class="flex h-full min-h-0 flex-col overflow-hidden bg-background">
  <section class="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col py-8">
    <div
      class="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex min-w-0 items-center gap-3">
        <h1 class="shrink-0 text-xl font-semibold text-foreground">
          {resolvedTitle}
        </h1>
        <div class="relative w-62">
          <MagnifyingGlassIcon
            class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            oninput={(event) =>
              handleQueryInput((event.currentTarget as HTMLInputElement).value)}
            placeholder="Search documents..."
            class="h-7 rounded-[8px] border-border bg-background pl-8 text-xs"
          />
        </div>
      </div>

      <div class="flex items-center gap-2">
        {#if tableFilter !== "shared"}
          <div bind:this={filterRef} class="relative">
            <Button
              type="button"
              variant="outline"
              class="gap-2 h-7"
              onclick={() => (filterOpen = !filterOpen)}
            >
              <FunnelSimpleIcon class="size-3.5" />
              {activeFilterLabel}
              <CaretDownIcon class="size-3 text-muted-foreground" />
            </Button>
            {#if filterOpen}
              <div
                class="absolute right-0 top-[calc(100%+0.35rem)] z-20 min-w-44 rounded-lg border border-border bg-popover p-1"
              >
                {#each FILTER_OPTIONS as option (option.value)}
                  <button
                    type="button"
                    class={cn(
                      "flex h-7 w-full items-center rounded-md px-2 text-left text-[13px] transition-colors hover:bg-muted",
                      tableFilter === option.value
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                    onclick={() => {
                      onFilterChange(option.value);
                      filterOpen = false;
                    }}
                  >
                    {option.label}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        {#if tableFilter !== "shared"}
          <input
            bind:this={fileInputEl}
            type="file"
            accept="application/pdf,.pdf"
            class="hidden"
            onchange={(event) => {
              const input = event.currentTarget as HTMLInputElement;
              handleFile(input.files?.[0]);
              input.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            class="gap-2 h-7"
            onclick={() => fileInputEl?.click()}
          >
            <UploadSimpleIcon class="size-3.5" />
            Upload document
          </Button>
        {/if}
      </div>
    </div>

    <div class="mt-5 min-h-0 flex-1 overflow-auto bg-background">
      <table
        class="w-full min-w-[720px] border-collapse table-auto md:table-fixed"
      >
        <colgroup>
          <col style="width: 24rem" />
          {#if variant === "documents"}
            <col />
            <col />
            <col />
            <col />
            <col style="width: 9rem" />
          {:else}
            <col />
            <col />
            <col />
            <col style="width: 9rem" />
          {/if}
        </colgroup>
        <thead>
          <tr class="h-9 bg-muted/40">
            {#each columns as column, index (column || `actions-${index}`)}
              <th
                class={cn(
                  "text-left text-xs font-medium text-muted-foreground",
                  column === "" && "w-36",
                )}
              >
                {column}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#if isInitialLoading}
            {#each Array.from({ length: 6 }) as _, rowIndex (rowIndex)}
              <tr class="border-b border-border/50">
                {#each columns as column, colIndex (column || `sk-${colIndex}`)}
                  <td class="px-4 py-2.5">
                    <Skeleton
                      class={cn(
                        "h-4",
                        colIndex === 0
                          ? "w-[24rem]"
                          : colIndex === columns.length - 1
                            ? "ml-auto w-20"
                            : "w-20",
                      )}
                    />
                  </td>
                {/each}
              </tr>
            {/each}
          {:else if filteredDocuments.length === 0}
            <tr>
              <td
                colspan={columns.length}
                class="py-12 text-center text-[13px] text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          {:else}
            {#each filteredDocuments as document (document.id)}
              {@const counts = getDocumentCounts(document)}
              {@const status =
                variant === "shared"
                  ? counts.completed === counts.total && counts.total > 0
                    ? "Completed"
                    : counts.completed > 0
                      ? "In Progress"
                      : "Pending"
                  : getDocumentSetupStatus(document)}
              <tr
                class="group cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
                onclick={() => onSelectDocument(document)}
              >
                <td class="py-2.5">
                  <p class="truncate text-[13px] font-medium text-foreground">
                    {document.name}
                  </p>
                </td>

                {#if variant === "documents"}
                  <td class="py-2.5 text-[13px] text-muted-foreground">
                    {getDocumentType(document.name)}
                  </td>
                {/if}

                <td class="py-2.5">
                  <StatusBadge {status} />
                </td>

                {#if variant === "documents"}
                  <td
                    class="py-2.5 text-[13px] tabular-nums text-muted-foreground"
                  >
                    {counts.fields}
                  </td>
                {:else}
                  <td
                    class="py-2.5 text-[13px] tabular-nums text-muted-foreground"
                  >
                    {counts.completed}/{Math.max(counts.total, 1)}
                  </td>
                {/if}

                <td class="py-2.5 text-[13px] text-muted-foreground">
                  {format(new Date(document.createdAt), "MMM d, yyyy")}
                </td>

                <td
                  class="py-2.5 text-right"
                  onclick={(event) => event.stopPropagation()}
                >
                  {#if showActions}
                    <div class="inline-flex items-center justify-end gap-0.5">
                      {#if onOverviewDocument}
                        <button
                          type="button"
                          class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-foreground"
                          aria-label={`Overview ${document.name}`}
                          title="Overview"
                          onclick={() => onOverviewDocument(document)}
                        >
                          <svg
                            class="size-3.5"
                            viewBox="0 0 256 256"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM116,84a12,12,0,1,1,12,12A12,12,0,0,1,116,84Z"
                            />
                          </svg>
                        </button>
                      {/if}
                      {#if onRestoreDocument}
                        <button
                          type="button"
                          class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-foreground"
                          aria-label={`Restore ${document.name}`}
                          title="Restore"
                          onclick={() => onRestoreDocument(document)}
                        >
                          <ArrowCounterClockwiseIcon class="size-3.5" />
                        </button>
                      {/if}
                      {#if onArchiveDocument}
                        <button
                          type="button"
                          class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-foreground"
                          aria-label={`Archive ${document.name}`}
                          title="Archive"
                          onclick={() => onArchiveDocument(document)}
                        >
                          <ArchiveIcon class="size-3.5 text-emerald-600" />
                        </button>
                      {/if}
                      {#if onDeleteDocument}
                        <button
                          type="button"
                          class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-red-600"
                          aria-label={`Delete ${document.name}`}
                          title="Delete"
                          onclick={() => onDeleteDocument(document)}
                        >
                          <TrashIcon class="size-3.5 text-red-600" />
                        </button>
                      {/if}
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</main>
