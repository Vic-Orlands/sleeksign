<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { enhance } from "$app/forms";
  import { nanoid } from "nanoid";
  import { toast } from "svelte-sonner";
  import DashboardHome, {
    type DashboardFilter,
  } from "$lib/components/docs/dashboard-home.svelte";
  import DocumentOverviewSheet from "$lib/components/docs/document-overview-sheet.svelte";
  import type { DocumentRecord } from "$lib/components/docs/types";
  import { getDocumentSetupStatus } from "$lib/components/docs/types";
  import {
    backgroundUploadStore,
    type BackgroundUpload,
  } from "$lib/background-upload-store";
  import Button from "$lib/components/ui/button.svelte";
  import Dialog from "$lib/components/ui/dialog.svelte";
  import DialogContent from "$lib/components/ui/dialog-content.svelte";
  import DialogDescription from "$lib/components/ui/dialog-description.svelte";
  import DialogFooter from "$lib/components/ui/dialog-footer.svelte";
  import DialogHeader from "$lib/components/ui/dialog-header.svelte";
  import DialogTitle from "$lib/components/ui/dialog-title.svelte";
  import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";
  import type { ActionResult } from "@sveltejs/kit";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { CircleNotchIcon } from "phosphor-svelte";

  let { data } = $props();

  let query = $state("");
  let tableFilter = $state<DashboardFilter>("all");
  let documentAction = $state<"" | "archive" | "delete" | "restore">("");
  let documentToDelete = $state<DocumentRecord | null>(null);
  let documentToArchive = $state<DocumentRecord | null>(null);
  let documentToRestore = $state<DocumentRecord | null>(null);
  let overviewDocument = $state<DocumentRecord | null>(null);
  let overviewOpen = $state(false);
  let activeUploadId = $state("");
  let uploads = $state<Record<string, BackgroundUpload>>({});

  const workspaceId = $derived(data.workspaceId || "");
  const documents = $derived((data.documents || []) as DocumentRecord[]);
  const loadError = $derived(data.error || null);

  const scopedDocuments = $derived(
    documents.filter((document) => {
      if (document.archivedAt) return tableFilter === "archived";
      if (document.deletedAt) return false;
      if (tableFilter === "all") return true;
      if (tableFilter === "archived") return false;
      return getDocumentSetupStatus(document) === tableFilter;
    }),
  );

  const filteredDocuments = $derived(
    scopedDocuments.filter((document) =>
      document.name.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );

  const activeUpload = $derived(
    activeUploadId ? uploads[activeUploadId] : undefined,
  );

  $effect(() => {
    if (workspaceId) setCurrentWorkspaceId(workspaceId);
  });

  $effect(() => {
    return backgroundUploadStore.subscribe(() => {
      uploads = backgroundUploadStore.getUploads();
    });
  });

  function actionEnhance(
    action: "" | "archive" | "delete" | "restore",
    onSuccess: () => void,
  ): SubmitFunction {
    return () => {
      documentAction = action;
      return async ({ result, update }) => {
        const actionResult = result as ActionResult;
        documentAction = "";
        if (actionResult.type === "success") {
          onSuccess();
          toast.success(
            (actionResult.data as { message?: string } | undefined)?.message ||
              "Done",
          );
          await update();
          return;
        }
        if (actionResult.type === "failure") {
          toast.error(
            (actionResult.data as { error?: string } | undefined)?.error ||
              "Request failed",
          );
        }
        await update({ reset: false });
      };
    };
  }

  async function handleUpload(file: File) {
    if (!workspaceId) {
      toast.error("No active workspace selected");
      return;
    }

    const docId = nanoid();
    activeUploadId = docId;
    backgroundUploadStore.startUpload(file, workspaceId, docId, {
      onSuccess: async () => {
        await invalidateAll();
        void goto(`/docs/${docId}`);
      },
      onError: (error) => {
        toast.error(error.message || "Upload failed");
        backgroundUploadStore.clearUpload(docId);
        activeUploadId = "";
      },
    });
  }
</script>

{#if loadError}
  <div class="flex h-full items-center justify-center p-8 text-sm text-red-600">
    {loadError}
  </div>
{:else}
  <DashboardHome
    {filteredDocuments}
    {tableFilter}
    onFilterChange={(filter) => (tableFilter = filter)}
    bind:query
    onUpload={handleUpload}
    {workspaceId}
    isInitialLoading={false}
    onSelectDocument={(document) => goto(`/docs/${document.id}`)}
    onOverviewDocument={(document) => {
      overviewDocument = document;
      overviewOpen = true;
    }}
    onDeleteDocument={tableFilter === "archived"
      ? undefined
      : (document) => {
          documentToDelete = document;
        }}
    onArchiveDocument={tableFilter === "archived"
      ? undefined
      : (document) => {
          documentToArchive = document;
        }}
    onRestoreDocument={tableFilter === "archived"
      ? (document) => {
          documentToRestore = document;
        }
      : undefined}
  />
{/if}

<DocumentOverviewSheet
  bind:open={overviewOpen}
  document={overviewDocument}
  onOpenSetup={(document) => {
    overviewOpen = false;
    void goto(`/docs/${document.id}`);
  }}
/>

{#if activeUpload && activeUpload.status === "uploading"}
  <div
    class="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-background/55 backdrop-blur-[2px]"
  >
    <div
      class="w-[min(92vw,24rem)] rounded-lg border border-border bg-background px-5 py-4"
    >
      <p class="text-[11px] text-muted-foreground">Document upload</p>
      <p class="mt-2 text-sm font-medium">Uploading document</p>
      <div
        class="mt-3 flex min-w-0 items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
      >
        <span class="min-w-0 truncate text-sm font-medium"
          >{activeUpload.name}</span
        >
      </div>
      <div class="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          class="h-full bg-foreground/80 transition-all duration-200"
          style={`width: ${Math.max(2, Math.min(100, activeUpload.progress ?? 8))}%`}
        ></div>
      </div>
    </div>
  </div>
{/if}

<Dialog
  open={Boolean(documentToDelete)}
  onOpenChange={(open) => {
    if (!open && !documentAction) documentToDelete = null;
  }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete document?</DialogTitle>
      <DialogDescription>
        This will remove the document from document management while keeping
        signer history available in the other views.
      </DialogDescription>
    </DialogHeader>
    <div class="rounded-lg border border-border bg-background p-3 text-sm">
      {documentToDelete?.name}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        disabled={documentAction === "delete"}
        onclick={() => (documentToDelete = null)}
      >
        Cancel
      </Button>
      <form
        method="POST"
        action="?/deleteDocument"
        use:enhance={actionEnhance("delete", () => {
          documentToDelete = null;
        })}
      >
        <input
          type="hidden"
          name="documentId"
          value={documentToDelete?.id || ""}
        />
        <Button
          type="submit"
          variant="destructive"
          loading={documentAction === "delete"}
        >
          {#if documentAction === "delete"}
            <CircleNotchIcon class="size-4 animate-spin" aria-hidden="true" />
            Deleting...
          {:else}
            Delete
          {/if}
        </Button>
      </form>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog
  open={Boolean(documentToArchive)}
  onOpenChange={(open) => {
    if (!open && !documentAction) documentToArchive = null;
  }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Archive document?</DialogTitle>
      <DialogDescription>
        This removes the document from All Documents without deleting signer
        history.
      </DialogDescription>
    </DialogHeader>
    <div class="rounded-lg border border-border bg-background p-3 text-sm">
      {documentToArchive?.name}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        disabled={documentAction === "archive"}
        onclick={() => (documentToArchive = null)}
      >
        Cancel
      </Button>
      <form
        method="POST"
        action="?/archiveDocument"
        use:enhance={actionEnhance("archive", () => {
          documentToArchive = null;
        })}
      >
        <input
          type="hidden"
          name="documentId"
          value={documentToArchive?.id || ""}
        />
        <Button type="submit" loading={documentAction === "archive"}
          >Archive</Button
        >
      </form>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog
  open={Boolean(documentToRestore)}
  onOpenChange={(open) => {
    if (!open && !documentAction) documentToRestore = null;
  }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Restore document?</DialogTitle>
      <DialogDescription>
        This returns the document to All Documents and makes it
        editable/shareable again.
      </DialogDescription>
    </DialogHeader>
    <div class="rounded-lg border border-border bg-background p-3 text-sm">
      {documentToRestore?.name}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        disabled={documentAction === "restore"}
        onclick={() => (documentToRestore = null)}
      >
        Cancel
      </Button>
      <form
        method="POST"
        action="?/restoreDocument"
        use:enhance={actionEnhance("restore", () => {
          documentToRestore = null;
        })}
      >
        <input
          type="hidden"
          name="documentId"
          value={documentToRestore?.id || ""}
        />
        <Button type="submit" loading={documentAction === "restore"}
          >Restore</Button
        >
      </form>
    </DialogFooter>
  </DialogContent>
</Dialog>
