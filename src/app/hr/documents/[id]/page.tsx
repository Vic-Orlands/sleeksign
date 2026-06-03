"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, EyeIcon, SendIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

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

export default function HRDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const setupRef = useRef<HTMLDivElement>(null);
  const bgUpload = useBackgroundUpload(id);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [document, setDocument] = useState<DocumentRecord | null>(() =>
    readUploadedDocumentDraft(id),
  );
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(
    () => !readUploadedDocumentDraft(id),
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const workspaceId = useCurrentWorkspaceId();
  const bgUploadStatus = bgUpload?.status;
  const bgUploadError = bgUpload?.error;
  const isDocumentUploading =
    Boolean(bgUpload && bgUpload.status === "uploading") ||
    document?.uploadStatus === "pending_upload";

  function normalizeDocuments(data: unknown) {
    return Array.isArray(data) ? (data as DocumentRecord[]) : [];
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchDocumentWithRetry() {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const documentRes = await fetch(`/api/documents/${id}`, {
          cache: "no-store",
        });

        if (documentRes.ok) {
          const documentData = await documentRes.json();
          clearUploadedDocumentDraft(id);
          return documentData as DocumentRecord;
        }

        lastError = new Error(
          `Failed to fetch document: ${documentRes.status}`,
        );
        await new Promise((resolve) =>
          window.setTimeout(resolve, 180 * (attempt + 1)),
        );
      }

      throw lastError || new Error("Document not found");
    }

    async function fetchIndividualDocument() {
      if (bgUploadStatus === "uploading") {
        setIsLoading(false);
        return;
      }

      if (bgUploadStatus === "success") {
        const uploadedDraft = readUploadedDocumentDraft(id);
        if (uploadedDraft) {
          setDocument((current) => ({
            ...(current || uploadedDraft),
            ...uploadedDraft,
          }));
        }
        setIsLoading(false);
      }

      if (bgUploadStatus === "error") {
        setIsLoading(false);
        setDocument(null);
        return;
      }

      if (!document) {
        setIsLoading(true);
      }
      try {
        const documentData = await fetchDocumentWithRetry();

        if (cancelled) return;
        setDocument(documentData);
        backgroundUploadStore.clearUpload(id);
      } catch {
        if (!cancelled) {
          setDocument(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    async function fetchWorkspaceDocuments() {
      try {
        const documentsRes = await fetch(
          workspaceId
            ? `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}`
            : "/api/documents",
        );
        if (!documentsRes.ok) return;
        const documentsData = await documentsRes.json();

        if (cancelled) return;
        setDocuments(normalizeDocuments(documentsData));
      } catch {
        // Asynchronous statistics background loading fail silent
      }
    }

    void fetchIndividualDocument();
    void fetchWorkspaceDocuments();

    return () => {
      cancelled = true;
    };
  }, [bgUploadError, bgUploadStatus, document, id, workspaceId]);

  const allSessions = documents.flatMap((item) => item.sessions || []);
  const completedCount = allSessions.filter(
    (session) => session.status === "completed",
  ).length;
  const pendingCount = allSessions.filter(
    (session) => session.status === "pending",
  ).length;
  const inProgressCount = documents.filter(
    (item) => getDocumentStatus(item) === "In Progress",
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

  function updateDocumentFields(documentId: string, fields: Field[]) {
    setDocument((current) =>
      current?.id === documentId ? { ...current, fields } : current,
    );
    setDocuments((current) =>
      current.map((item) =>
        item.id === documentId ? { ...item, fields } : item,
      ),
    );
  }

  function updateDocumentRoleConfigs(
    documentId: string,
    roleConfigs: RoleConfig[],
  ) {
    setDocument((current) =>
      current?.id === documentId ? { ...current, roleConfigs } : current,
    );
    setDocuments((current) =>
      current.map((item) =>
        item.id === documentId ? { ...item, roleConfigs } : item,
      ),
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
                    {bgUpload && bgUpload.status === "uploading" && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        Uploading {bgUpload.progress}%
                      </span>
                    )}
                    {bgUpload && bgUpload.status === "success" && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Synced
                      </span>
                    )}
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
                isUploading={isDocumentUploading}
                uploadProgress={bgUpload ? bgUpload.progress : 0}
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
