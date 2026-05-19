"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, SendIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { DocumentDetailPanel } from "@/components/hr/document-detail-panel";
import { DocumentSetupDock } from "@/components/hr/document-setup-dock";
import { HrShell } from "@/components/hr/hr-shell";
import type { DocumentRecord } from "@/components/hr/types";
import { getDocumentCounts, getDocumentStatus } from "@/components/hr/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Field } from "@/lib/field-utils";

export default function HRDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const setupRef = useRef<HTMLDivElement>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    async function fetchWorkspace() {
      setIsLoading(true);
      try {
        const [documentsRes, documentRes] = await Promise.all([
          fetch("/api/documents"),
          fetch(`/api/documents/${id}`),
        ]);
        const documentsData = await documentsRes.json();
        const documentData = documentRes.ok ? await documentRes.json() : null;
        setDocuments(documentsData);
        setDocument(documentData);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspace();
  }, [id]);

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
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.id) throw new Error("Upload failed");
      toast.success("Document uploaded");
      router.push(`/hr/documents/${data.id}`);
    } catch {
      toast.error("Upload failed");
    }
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

  return (
    <HrShell
      query={query}
      onQueryChange={setQuery}
      onUpload={handleUpload}
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
                  <h1 className="truncate font-mono text-xs font-semibold uppercase tracking-widest">
                    {document?.name || "Loading document..."}
                  </h1>
                </div>
              </div>
              {document ? (
                <div className="flex items-center gap-2">
                  <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
                    {getDocumentCounts(document).fields} fields placed
                  </span>
                  <Button onClick={() => setShareOpen(true)}>
                    <SendIcon data-icon="inline-start" />
                    Share Document
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div
            ref={setupRef}
            className="min-h-0 overflow-hidden bg-(--paper)] p-4"
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
                document={document}
                onFieldsChange={updateDocumentFields}
                fullHeight
              />
            ) : (
              <div className="flex h-full items-center justify-center border border-dashed border-border bg-card font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Document not found.
              </div>
            )}
          </div>
        </section>

        <Sheet open={shareOpen} onOpenChange={setShareOpen}>
          <SheetContent
            hideCloseButton
            className="left-auto right-0 w-[min(100vw,36rem)] max-w-none translate-x-full border-l border-r-0 p-0 data-[state=open]:translate-x-0"
          >
            <SheetTitle className="sr-only">Share document</SheetTitle>
            <DocumentDetailPanel
              document={document || undefined}
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
      </div>
    </HrShell>
  );
}
