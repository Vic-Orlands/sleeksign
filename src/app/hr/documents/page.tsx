"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  DocumentTable,
  DocumentTableSkeleton,
} from "@/components/hr/document-table";
import { HrShell } from "@/components/hr/hr-shell";
import type {
  DocumentRecord,
  DocumentSetupStatus,
} from "@/components/hr/types";
import {
  getDocumentSetupStatus,
  getDocumentStatus,
} from "@/components/hr/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { nanoid } from "nanoid";
import { backgroundUploadStore } from "@/lib/background-upload-store";
import { useCurrentWorkspaceId } from "@/lib/workspace-store";

type TableFilter = "all" | "archived" | "shared" | DocumentSetupStatus;

export default function HRDocuments() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [documentAction, setDocumentAction] = useState<
    "" | "archive" | "delete" | "restore"
  >("");
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentRecord | null>(null);
  const [documentToArchive, setDocumentToArchive] =
    useState<DocumentRecord | null>(null);
  const [documentToRestore, setDocumentToRestore] =
    useState<DocumentRecord | null>(null);

  const workspaceId = useCurrentWorkspaceId();
  const router = useRouter();
  const visibleDocuments = useMemo(
    () => (workspaceId ? documents : []),
    [documents, workspaceId],
  );
  const showLoading = isLoading;

  function normalizeDocuments(data: unknown) {
    return Array.isArray(data) ? (data as DocumentRecord[]) : [];
  }

  useEffect(() => {
    if (!workspaceId) {
      queueMicrotask(() => {
        setDocuments([]);
        setIsLoading(false);
      });
      return;
    }

    async function loadDocuments(options?: { background?: boolean }) {
      if (!options?.background) setIsLoading(true);
      try {
        const response = await fetch(
          `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}&includeArchived=true&includeDeleted=true`,
        );
        const data: unknown = await response.json();
        setDocuments(normalizeDocuments(data));
      } finally {
        if (!options?.background) setIsLoading(false);
      }
    }

    void loadDocuments();

    const interval = window.setInterval(() => {
      void loadDocuments({ background: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [workspaceId]);

  useEffect(() => {
    queueMicrotask(() => {
      if (window.location.search.includes("view=shared"))
        setTableFilter("shared");
    });
  }, []);

  async function fetchDocuments(options?: { background?: boolean }) {
    if (!workspaceId) {
      setDocuments([]);
      if (!options?.background) setIsLoading(false);
      return;
    }

    if (!options?.background) setIsLoading(true);
    try {
      const response = await fetch(
        `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}&includeArchived=true&includeDeleted=true`,
      );
      const data: unknown = await response.json();
      setDocuments(normalizeDocuments(data));
    } finally {
      if (!options?.background) setIsLoading(false);
    }
  }

  const scopedDocuments = useMemo(
    () =>
      visibleDocuments.filter((document) => {
        if (document.archivedAt) {
          return tableFilter === "archived";
        }
        if (document.deletedAt) {
          return false;
        }
        if (tableFilter === "all") return true;
        if (tableFilter === "archived") return false;
        if (tableFilter === "shared") return Boolean(document.sessions?.length);
        return getDocumentSetupStatus(document) === tableFilter;
      }),
    [visibleDocuments, tableFilter],
  );

  const filteredDocuments = useMemo(
    () =>
      scopedDocuments.filter((document) =>
        document.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [scopedDocuments, query],
  );
  const documentCountLabel = query.trim()
    ? `${filteredDocuments.length} of ${scopedDocuments.length} documents`
    : `${filteredDocuments.length} documents`;

  const allSessions = visibleDocuments.flatMap(
    (document) => document.sessions || [],
  );
  const completedCount = allSessions.filter(
    (session) => session.status === "completed",
  ).length;
  const pendingCount = allSessions.filter(
    (session) => session.status === "pending",
  ).length;
  const inProgressCount = visibleDocuments.filter(
    (document) => getDocumentStatus(document) === "In Progress",
  ).length;

  async function handleUpload(file: File) {
    if (!workspaceId) {
      toast.error("No active workspace selected");
      return;
    }

    const docId = nanoid();
    backgroundUploadStore.startUpload(file, workspaceId, docId);
    toast.success("Uploading document in background...");
    router.push(`/hr/documents/${docId}`);
  }

  async function deleteDocument() {
    if (!documentToDelete) return;

    const targetId = documentToDelete.id;
    setDocumentAction("delete");

    try {
      const res = await fetch(`/api/documents/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== targetId),
      );
      setDocumentToDelete(null);
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDocumentAction("");
    }
  }

  async function archiveDocument() {
    if (!documentToArchive) return;

    setDocumentAction("archive");
    try {
      const res = await fetch(`/api/documents/${documentToArchive.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "archive" }),
      });
      if (!res.ok) throw new Error("Archive failed");
      toast.success("Document archived");
      setDocumentToArchive(null);
      await fetchDocuments();
    } catch {
      toast.error("Failed to archive document");
    } finally {
      setDocumentAction("");
    }
  }

  async function restoreDocument() {
    if (!documentToRestore) return;

    setDocumentAction("restore");
    try {
      const res = await fetch(`/api/documents/${documentToRestore.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "restore" }),
      });
      if (!res.ok) throw new Error("Restore failed");
      toast.success("Document restored");
      setDocumentToRestore(null);
      await fetchDocuments();
    } catch {
      toast.error("Failed to restore document");
    } finally {
      setDocumentAction("");
    }
  }

  return (
    <>
      <HrShell
        query={query}
        onQueryChange={setQuery}
        onUpload={handleUpload}
        actionOverlay={{
          visible: false,
          title: "",
        }}
        activeView={tableFilter === "shared" ? "shared" : "documents"}
        onSharedActivityClick={() => setTableFilter("shared")}
        onDocumentsClick={() => {
          setTableFilter("all");
          router.push("/hr/documents");
        }}
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
        completedCount={completedCount}
      >
        <section className="min-h-0 overflow-auto bg-[(--paper)]">
          <div className="flex flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-mono text-xs font-semibold uppercase tracking-widest">
                {tableFilter === "shared"
                  ? "Shared Activity"
                  : tableFilter === "archived"
                    ? "Archived Docs"
                    : "All Documents"}
              </h1>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {workspaceId
                  ? documentCountLabel
                  : "Select a workspace to view documents"}
              </p>
            </div>
            {tableFilter === "shared" ? null : (
              <div className="flex overflow-x-auto border border-border bg-card">
                <FilterButton
                  value="all"
                  tableFilter={tableFilter}
                  onSelect={setTableFilter}
                >
                  All
                </FilterButton>
                <FilterButton
                  value="archived"
                  tableFilter={tableFilter}
                  onSelect={setTableFilter}
                >
                  Archived
                </FilterButton>
                <FilterButton
                  value="Needs Setup"
                  tableFilter={tableFilter}
                  onSelect={setTableFilter}
                >
                  Needs Setup
                </FilterButton>
                <FilterButton
                  value="Edited"
                  tableFilter={tableFilter}
                  onSelect={setTableFilter}
                >
                  Edited
                </FilterButton>
              </div>
            )}
          </div>
          {showLoading && (
            <div className="overflow-x-auto px-4 py-4 sm:px-5">
              <DocumentTableSkeleton
                variant={tableFilter === "shared" ? "shared" : "documents"}
                showActions={tableFilter !== "shared"}
              />
            </div>
          )}

          {!showLoading && !workspaceId && (
            <div className="mx-5 my-5 flex h-52 items-center justify-center border border-dashed border-border bg-card px-4 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Select or create a workspace from the account menu.
            </div>
          )}

          {!showLoading && workspaceId && filteredDocuments.length === 0 && (
            <div className="mx-5 my-5 flex h-52 items-center justify-center border border-dashed border-border bg-card font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              No documents match this search.
            </div>
          )}

          {!showLoading && workspaceId && filteredDocuments.length > 0 && (
            <div className="overflow-x-auto px-4 py-4 sm:px-5">
              <DocumentTable
                documents={filteredDocuments}
                variant={tableFilter === "shared" ? "shared" : "documents"}
                onSelectDocument={(document) =>
                  router.push(`/hr/documents/${document.id}`)
                }
                onDeleteDocument={
                  tableFilter === "shared" ? undefined : setDocumentToDelete
                }
                onArchiveDocument={
                  tableFilter === "shared" || tableFilter === "archived"
                    ? undefined
                    : setDocumentToArchive
                }
                onRestoreDocument={
                  tableFilter === "archived" ? setDocumentToRestore : undefined
                }
              />
            </div>
          )}
        </section>
      </HrShell>

      <Dialog
        open={Boolean(documentToDelete)}
        onOpenChange={(open) =>
          !open && !documentAction && setDocumentToDelete(null)
        }
      >
        <DialogContent className="rounded-none border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              Delete document?
            </DialogTitle>
            <DialogDescription>
              This will remove the document from document management while
              keeping signer history available in the other views.
            </DialogDescription>
          </DialogHeader>
          <div className="border border-border bg-background p-3 text-sm">
            {documentToDelete?.name}
          </div>
          <DialogFooter className="rounded-none border-border">
            <Button
              variant="outline"
              disabled={documentAction === "delete"}
              onClick={() => setDocumentToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={documentAction === "delete"}
              onClick={deleteDocument}
            >
              {documentAction === "delete" ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(documentToArchive)}
        onOpenChange={(open) =>
          !open && !documentAction && setDocumentToArchive(null)
        }
      >
        <DialogContent className="rounded-none border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              Archive document?
            </DialogTitle>
            <DialogDescription>
              This removes the document from All Documents without deleting
              signer history.
            </DialogDescription>
          </DialogHeader>
          <div className="border border-border bg-background p-3 text-sm">
            {documentToArchive?.name}
          </div>
          <DialogFooter className="rounded-none border-border">
            <Button
              variant="outline"
              disabled={documentAction === "archive"}
              onClick={() => setDocumentToArchive(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={documentAction === "archive"}
              onClick={archiveDocument}
            >
              {documentAction === "archive" ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(documentToRestore)}
        onOpenChange={(open) =>
          !open && !documentAction && setDocumentToRestore(null)
        }
      >
        <DialogContent className="rounded-none border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              Restore document?
            </DialogTitle>
            <DialogDescription>
              This returns the document to All Documents and makes it
              editable/shareable again.
            </DialogDescription>
          </DialogHeader>
          <div className="border border-border bg-background p-3 text-sm">
            {documentToRestore?.name}
          </div>
          <DialogFooter className="rounded-none border-border">
            <Button
              variant="outline"
              disabled={documentAction === "restore"}
              onClick={() => setDocumentToRestore(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={documentAction === "restore"}
              onClick={restoreDocument}
            >
              {documentAction === "restore" ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterButton({
  value,
  tableFilter,
  onSelect,
  children,
}: {
  value: TableFilter;
  tableFilter: TableFilter;
  onSelect: (filter: TableFilter) => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={tableFilter === value ? "secondary" : "ghost"}
      size="sm"
      className="shrink-0 border-0 rounded-none!"
      onClick={() => onSelect(value)}
    >
      {children}
    </Button>
  );
}
