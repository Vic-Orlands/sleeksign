"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, EyeIcon, SendIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";

import { DocumentDetailPanel } from "@/components/hr/document-detail-panel";
import { DocumentReviewPanel } from "@/components/hr/document-review-panel";
import { DocumentSetupDock } from "@/components/hr/document-setup-dock";
import { HrShell } from "@/components/hr/hr-shell";
import type { DocumentRecord } from "@/components/hr/types";
import { getDocumentCounts, getDocumentStatus } from "@/components/hr/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Field, RoleConfig } from "@/lib/field-utils";
import { nanoid } from "nanoid";
import {
  backgroundUploadStore,
  useBackgroundUpload,
} from "@/lib/background-upload-store";
import { useCurrentWorkspaceId } from "@/lib/workspace-store";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

async function fetchDocumentWithRetry(url: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const documentRes = await fetch(url, {
      cache: "no-store",
    });

    if (documentRes.ok) {
      const documentData = await documentRes.json();
      return documentData as DocumentRecord;
    }

    lastError = new Error(`Failed to fetch document: ${documentRes.status}`);
    await new Promise((resolve) =>
      window.setTimeout(resolve, 180 * (attempt + 1)),
    );
  }

  throw lastError || new Error("Document not found");
}

export default function HRDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const setupRef = useRef<HTMLDivElement>(null);
  const bgUpload = useBackgroundUpload(id);
  const [query, setQuery] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const workspaceId = useCurrentWorkspaceId();
  const bgUploadStatus = bgUpload?.status;
  const bgUploadError = bgUpload?.error;

  const fallbackDraft = useMemo(() => readUploadedDocumentDraft(id), [id]);

  // Fetch individual document
  const { data: fetchedDocument, error: documentError, mutate: mutateDocument } = useSWR<DocumentRecord>(
    id && bgUploadStatus !== "uploading" && bgUploadStatus !== "error"
      ? `/api/documents/${id}`
      : null,
    fetchDocumentWithRetry,
    {
      shouldRetryOnError: false,
      onSuccess: () => {
        clearUploadedDocumentDraft(id);
        backgroundUploadStore.clearUpload(id);
      },
    }
  );

  // Fetch workspace documents
  const { data: documentsData, mutate: mutateDocuments } = useSWR<DocumentRecord[]>(
    workspaceId
      ? `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}`
      : "/api/documents",
    fetcher
  );

  function normalizeDocuments(data: unknown) {
    return Array.isArray(data) ? (data as DocumentRecord[]) : [];
  }

  const document = useMemo(() => {
    if (bgUploadStatus === "uploading") {
      return fallbackDraft;
    }
    if (bgUploadStatus === "error") {
      return null;
    }
    if (bgUploadStatus === "success") {
      const draft = readUploadedDocumentDraft(id);
      if (draft) {
        return fetchedDocument ? { ...fetchedDocument, ...draft } : draft;
      }
    }
    return fetchedDocument || fallbackDraft;
  }, [fetchedDocument, fallbackDraft, bgUploadStatus, id]);

  const documents = useMemo(() => normalizeDocuments(documentsData), [documentsData]);

  const isLoading = useMemo(() => {
    if (bgUploadStatus === "uploading" || bgUploadStatus === "success" || bgUploadStatus === "error") {
      return false;
    }
    return !document && !documentError;
  }, [document, documentError, bgUploadStatus]);

  const isDocumentUploading =
    Boolean(bgUpload && bgUpload.status === "uploading") ||
    document?.uploadStatus === "pending_upload";

  const allSessions = useMemo(() => documents.flatMap((item) => item.sessions || []), [documents]);
  const completedCount = useMemo(() => allSessions.filter(
    (session) => session.status === "completed",
  ).length, [allSessions]);
  const pendingCount = useMemo(() => allSessions.filter(
    (session) => session.status === "pending",
  ).length, [allSessions]);
  const inProgressCount = useMemo(() => documents.filter(
    (item) => getDocumentStatus(item) === "In Progress",
  ).length, [documents]);

  async function handleUpload(file: File) {
    if (!workspaceId) {
      toast.error("No active workspace selected");
      return;
    }
    const docId = nanoid();
    backgroundUploadStore.startUpload(file, workspaceId, docId);
    router.push(`/hr/documents/${docId}`);
  }

  function updateDocumentFields(documentId: string, fields: Field[]) {
    void mutateDocument(
      (current) => (current?.id === documentId ? { ...current, fields } : current),
      { revalidate: false }
    );
    void mutateDocuments(
      (current) =>
        current?.map((item) => (item.id === documentId ? { ...item, fields } : item)) || [],
      { revalidate: false }
    );
  }

  function updateDocumentRoleConfigs(
    documentId: string,
    roleConfigs: RoleConfig[],
  ) {
    void mutateDocument(
      (current) => (current?.id === documentId ? { ...current, roleConfigs } : current),
      { revalidate: false }
    );
    void mutateDocuments(
      (current) =>
        current?.map((item) => (item.id === documentId ? { ...item, roleConfigs } : item)) || [],
      { revalidate: false }
    );
  }

  function getUnassignedFieldCount(currentDocument?: DocumentRecord | null) {
    return (currentDocument?.fields || []).filter(
      (field) => !String(field.assigneeRole || "").trim(),
    ).length;
  }

  function openSharePanel() {
    const unassignedFieldCount = getUnassignedFieldCount(document);

    if (unassignedFieldCount > 0) {
      toast.error(
        `Assign all ${unassignedFieldCount} unassigned field${unassignedFieldCount === 1 ? "" : "s"} before sharing`,
      );
      setupRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    setShareOpen(true);
  }

  return (
    <HrShell
      query={query}
      onQueryChange={setQuery}
      onUpload={handleUpload}
      actionOverlay={{
        visible: false,
        title: "",
      }}
      headerMode="none"
      pendingCount={pendingCount}
      inProgressCount={inProgressCount}
      completedCount={completedCount}
    >
      <div className="grid min-h-0 overflow-auto xl:overflow-hidden">
        <section className="grid min-h-[760px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[var(--paper)] xl:min-h-0">
          <div className="border-b border-border bg-background px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/hr/documents")}
                >
                  <ArrowLeftIcon />
                </Button>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    All Documents / Document
                  </p>
                  <h1 className="truncate font-mono text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                    {document?.name || "Loading document..."}
                  </h1>
                </div>
              </div>
              {document ? (
                <div className="flex items-center gap-2">
                  <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
                    {getDocumentCounts(document).fields} fields placed
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setReviewOpen(true)}
                    disabled={isDocumentUploading}
                  >
                    <EyeIcon data-icon="inline-start" />
                    Review
                  </Button>
                  <Button
                    onClick={openSharePanel}
                    disabled={isDocumentUploading}
                  >
                    <SendIcon data-icon="inline-start" />
                    Share Document
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div
            ref={setupRef}
            className="min-h-0 overflow-hidden bg-[var(--paper)] p-4"
          >
            {isLoading ? (
              <div className="grid h-full min-h-0 overflow-hidden border border-border bg-card lg:grid-cols-[150px_minmax(0,1fr)_178px]">
                <div className="border-b p-3 lg:border-b-0 lg:border-r">
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="min-h-105 p-6">
                  <Skeleton className="mx-auto h-full max-h-160 w-full max-w-130" />
                </div>
                <div className="border-t p-3 lg:border-l lg:border-t-0">
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ) : document ? (
              <DocumentSetupDock
                key={`${document.id}:${document.fileUrl}`}
                document={document}
                onFieldsChange={updateDocumentFields}
                onRoleConfigsChange={updateDocumentRoleConfigs}
                fullHeight
              />
            ) : (
              <div className="flex h-full items-center justify-center border border-dashed border-border bg-card font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Document not found.
              </div>
            )}
          </div>
        </section>

        <Sheet
          open={shareOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setShareOpen(false);
              return;
            }

            openSharePanel();
          }}
        >
          <SheetContent
            hideCloseButton
            className="left-auto right-0 w-[min(100vw,36rem)] max-w-none translate-x-full border-l border-r-0 p-0 data-[state=open]:translate-x-0"
          >
            <SheetTitle className="sr-only">Share document</SheetTitle>
            <DocumentDetailPanel
              document={document || undefined}
              canShare={getUnassignedFieldCount(document) === 0}
              onClose={() => setShareOpen(false)}
              onEdit={() => {
                setShareOpen(false);
                setupRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            />
          </SheetContent>
        </Sheet>

        {document ? (
          <Sheet open={reviewOpen} onOpenChange={setReviewOpen}>
            <SheetContent
              hideCloseButton
              className="left-auto right-0 w-[min(100vw,72rem)] max-w-none translate-x-full border-l border-r-0 p-0 data-[state=open]:translate-x-0"
            >
              <SheetTitle className="sr-only">
                Review document before sharing
              </SheetTitle>
              <DocumentReviewPanel
                document={document}
                onClose={() => setReviewOpen(false)}
              />
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
    </HrShell>
  );
}

function readUploadedDocumentDraft(documentId: string) {
  if (typeof window === "undefined") return null;

  const rawValue = window.sessionStorage.getItem(
    `sleeksign:uploaded-document:${documentId}`,
  );
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as DocumentRecord;
  } catch {
    return null;
  }
}

function clearUploadedDocumentDraft(documentId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(`sleeksign:uploaded-document:${documentId}`);
}
