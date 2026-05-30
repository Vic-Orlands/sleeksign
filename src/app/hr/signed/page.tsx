"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  DownloadIcon,
  FolderIcon,
  MailIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { HrShell } from "@/components/hr/hr-shell";
import { StatusBadge } from "@/components/hr/status-badge";
import type { DocumentRecord, SessionRecord } from "@/components/hr/types";
import { getDocumentStatus } from "@/components/hr/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadDocument } from "@/lib/upload-document";
import { useCurrentWorkspaceId } from "@/lib/workspace-store";

type SignedSession = SessionRecord & {
  documentName: string;
};

type SignedSessionGroup = {
  documentId: string;
  documentName: string;
  sessions: SignedSession[];
};

export default function SignedDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [uploadingDocumentName, setUploadingDocumentName] = useState<
    string | null
  >(null);
  const [selectedGroup, setSelectedGroup] = useState<SignedSessionGroup | null>(
    null,
  );
  const [groupQuery, setGroupQuery] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<SignedSession | null>(
    null,
  );
  const workspaceId = useCurrentWorkspaceId();
  const router = useRouter();
  const visibleDocuments = useMemo(
    () => (workspaceId ? documents : []),
    [documents, workspaceId],
  );

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

    const fetchWorkspaceDocuments = (options?: { background?: boolean }) => {
      if (!options?.background) setIsLoading(true);
      fetch(
        `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}&includeArchived=true&includeDeleted=true`,
      )
        .then((res) => res.json())
        .then((data: unknown) => setDocuments(normalizeDocuments(data)))
        .finally(() => {
          if (!options?.background) setIsLoading(false);
        });
    };

    fetchWorkspaceDocuments();
    const interval = window.setInterval(
      () => fetchWorkspaceDocuments({ background: true }),
      5000,
    );
    return () => window.clearInterval(interval);
  }, [workspaceId]);

  const signedSessions = useMemo(() => {
    return visibleDocuments.flatMap((document) =>
      (document.sessions || [])
        .filter(
          (session) =>
            session.status === "completed" &&
            (Boolean(session.finalizedFileUrl) ||
              !session.id.startsWith("packet-")),
        )
        .map((session) => ({
          ...session,
          documentName: document.name,
        })),
    );
  }, [visibleDocuments]);

  const filteredSessions = signedSessions.filter((session) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [session.documentName, session.signerName, session.signerEmail]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });

  const sessionGroups = useMemo(() => {
    const groups = new Map<string, SignedSession[]>();

    for (const session of filteredSessions) {
      groups.set(session.documentId, [
        ...(groups.get(session.documentId) || []),
        session,
      ]);
    }

    return Array.from(groups.entries())
      .map(([documentId, sessions]) => ({
        documentId,
        documentName: sessions[0]?.documentName || "Signed document",
        sessions: sessions.sort(sortByCompletedAt),
      }))
      .sort(
        (a, b) =>
          getLatestCompletedAt(b.sessions) - getLatestCompletedAt(a.sessions),
      );
  }, [filteredSessions]);

  const selectedGroupSessions = useMemo(() => {
    const needle = groupQuery.trim().toLowerCase();
    if (!selectedGroup) return [];
    if (!needle) return selectedGroup.sessions;

    return selectedGroup.sessions.filter((session) =>
      [session.signerName, session.signerEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [groupQuery, selectedGroup]);

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
    setUploadingDocumentName(file.name);

    try {
      const data = await uploadDocument(file, workspaceId);
      toast.success("Document uploaded");
      router.push(`/hr/documents/${data.id}`);
    } catch (error) {
      setUploadingDocumentName(null);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function deleteSignedSession() {
    if (!sessionToDelete) return;

    setIsDeletingSession(true);
    try {
      const res = await fetch(`/api/signers/${sessionToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Signed copy deleted");
      setSessionToDelete(null);
      setSelectedGroup((current) =>
        current
          ? {
              ...current,
              sessions: current.sessions.filter(
                (session) => session.id !== sessionToDelete.id,
              ),
            }
          : current,
      );
      const data = await fetch(
        `/api/documents?workspaceId=${encodeURIComponent(workspaceId || "")}&includeArchived=true&includeDeleted=true`,
      ).then((res) => res.json());
      setDocuments(normalizeDocuments(data));
    } catch {
      toast.error("Failed to delete signed copy");
    } finally {
      setIsDeletingSession(false);
    }
  }

  return (
    <>
      <HrShell
        query={query}
        onQueryChange={setQuery}
        onUpload={handleUpload}
        actionOverlay={{
          visible: Boolean(uploadingDocumentName),
          title: "Uploading document",
          documentName: uploadingDocumentName || undefined,
          detail: "Preparing for setup.",
        }}
        activeView="signed"
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
        completedCount={completedCount}
      >
        <section className="min-h-0 overflow-auto bg-[(--paper)]">
          <div className="flex flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-mono text-xs font-semibold uppercase tracking-widest">
                Signed Docs
              </h1>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {filteredSessions.length} of {signedSessions.length} completed
                signing sessions
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2 px-5 py-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : !workspaceId ? (
            <div className="flex h-52 items-center justify-center px-5 py-5">
              <div className="flex h-full w-full items-center justify-center border border-dashed border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Select a workspace to view signed documents.
              </div>
            </div>
          ) : (
            <SignedDocsTable
              groups={sessionGroups}
              onDeleteSession={setSessionToDelete}
              onOpenGroup={(group) => {
                setSelectedGroup(group);
                setGroupQuery("");
              }}
            />
          )}
        </section>
      </HrShell>

      <Sheet
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
      >
        <SheetContent className="left-auto right-0 w-[min(100vw,56rem)] max-w-none translate-x-full border-l border-r-0 p-0 data-[state=open]:translate-x-0">
          <SheetTitle className="sr-only">Signed document group</SheetTitle>
          <div className="grid h-full grid-rows-[auto_auto_minmax(0,1fr)] bg-background">
            <div className="border-b border-border px-5 py-4 pr-12">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Signed document group
              </p>
              <h2 className="mt-2 truncate text-lg font-semibold">
                {selectedGroup?.documentName}
              </h2>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {selectedGroup?.sessions.length || 0} signed copies
              </p>
            </div>
            <div className="border-b border-border bg-card px-5 py-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={groupQuery}
                  onChange={(event) => setGroupQuery(event.target.value)}
                  placeholder="Search signers..."
                  className="h-9 bg-background pl-9"
                />
              </div>
            </div>
            <div className="min-h-0 overflow-auto p-5">
              <SignedGroupList
                sessions={selectedGroupSessions}
                onDeleteSession={setSessionToDelete}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(sessionToDelete)}
        onOpenChange={(open) => !open && !isDeletingSession && setSessionToDelete(null)}
      >
        <DialogContent className="rounded-none border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              Delete signed copy?
            </DialogTitle>
            <DialogDescription>
              This removes the signed copy from Signed Docs without affecting
              the source document setup.
            </DialogDescription>
          </DialogHeader>
          <div className="border border-border bg-background p-3 text-sm">
            {sessionToDelete?.documentName} ·{" "}
            {sessionToDelete?.signerName || "Anonymous signer"}
          </div>
          <DialogFooter className="rounded-none border-border">
            <Button variant="outline" disabled={isDeletingSession} onClick={() => setSessionToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeletingSession} onClick={deleteSignedSession}>
              {isDeletingSession ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SignedDocsTable({
  groups,
  onDeleteSession,
  onOpenGroup,
}: {
  groups: SignedSessionGroup[];
  onDeleteSession: (session: SignedSession) => void;
  onOpenGroup: (group: SignedSessionGroup) => void;
}) {
  return (
    <div className="overflow-x-auto px-4 py-4 sm:px-5">
      <div className="min-w-[860px] border border-border bg-background text-[11px]">
        <div className="grid grid-cols-12 gap-4 border-b border-border bg-secondary p-4 font-mono uppercase tracking-tight text-muted-foreground">
          <div className="col-span-4">Document</div>
          <div className="col-span-3">Signer</div>
          <div className="col-span-2">Completed</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Review / Download</div>
        </div>

        {groups.length === 0 ? (
          <div className="m-4 flex h-52 items-center justify-center border border-dashed border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            No signed documents yet.
          </div>
        ) : (
          groups.map((group) =>
            group.sessions.length > 1 ? (
              <SignedGroupRow
                key={group.documentId}
                group={group}
                onOpen={() => onOpenGroup(group)}
              />
            ) : (
              <SignedSessionRow
                key={group.sessions[0].id}
                session={group.sessions[0]}
                onDelete={onDeleteSession}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}

function SignedGroupRow({
  group,
  onOpen,
}: {
  group: SignedSessionGroup;
  onOpen: () => void;
}) {
  const latest = group.sessions[0];

  return (
    <div className="grid grid-cols-12 items-center gap-4 border-b border-border bg-card p-4 transition-colors hover:bg-secondary">
      <div className="col-span-4 min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-background">
            <FolderIcon className="size-4 text-[#c9a84c]" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-foreground">
              {group.documentName}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {group.sessions.length} signed copies
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-3 space-y-1">
        <div className="text-[13px] font-bold text-foreground">
          {latest.signerName || "Anonymous signer"}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          Latest signer
        </div>
      </div>
      <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {formatCompletedAt(latest)}
      </div>
      <div className="col-span-1">
        <StatusBadge status={latest.status} />
      </div>
      <div className="col-span-2 text-right">
        <Button onClick={onOpen}>Open Group</Button>
      </div>
    </div>
  );
}

function SignedSessionRow({
  session,
  onDelete,
}: {
  session: SignedSession;
  onDelete: (session: SignedSession) => void;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-4 border-b border-border p-4 transition-colors hover:bg-secondary">
      <div className="col-span-4">
        <div className="truncate text-[13px] font-bold text-foreground">
          {session.documentName}
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Session {session.id.slice(0, 10)}
        </div>
      </div>
      <SignerCell session={session} className="col-span-3" />
      <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {formatCompletedAt(session)}
      </div>
      <div className="col-span-1">
        <StatusBadge status={session.status} />
      </div>
      <SessionActions
        session={session}
        className="col-span-2"
        onDelete={onDelete}
      />
    </div>
  );
}

function SignedGroupList({
  sessions,
  onDeleteSession,
}: {
  sessions: SignedSession[];
  onDeleteSession: (session: SignedSession) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center border border-dashed border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        No signers match this search.
      </div>
    );
  }

  return (
    <div className="border border-border text-[11px]">
      <div className="grid grid-cols-12 gap-4 border-b border-border bg-secondary p-4 font-mono uppercase tracking-tight text-muted-foreground">
        <div className="col-span-4">Signer</div>
        <div className="col-span-2">Completed</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>
      {sessions.map((session) => (
        <div
          key={session.id}
          className="grid grid-cols-12 items-center gap-4 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-secondary"
        >
          <SignerCell
            session={session}
            className="col-span-4"
            reviewUrl={getReviewUrl(session)}
          />
          <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {formatCompletedAt(session)}
          </div>
          <div className="col-span-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {session.signerRole || "Signer"}
          </div>
          <div className="col-span-2">
            <StatusBadge status={session.status} />
          </div>
          <SessionActions
            session={session}
            className="col-span-2"
            onDelete={onDeleteSession}
            showReview={false}
            compactDownload
          />
        </div>
      ))}
    </div>
  );
}

function SignerCell({
  session,
  className,
  reviewUrl,
}: {
  session: SignedSession;
  className?: string;
  reviewUrl?: string;
}) {
  return (
    <div className={`${className || ""} space-y-1`}>
      {reviewUrl ? (
        <button
          type="button"
          className="text-left text-[13px] font-bold text-foreground underline-offset-4 hover:underline"
          onClick={() => window.open(reviewUrl, "_blank")}
        >
          {session.signerName || "Anonymous signer"}
        </button>
      ) : (
        <div className="text-[13px] font-bold text-foreground">
          {session.signerName || "Anonymous signer"}
        </div>
      )}
      <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
        <MailIcon className="size-3" />
        {session.signerEmail || "No email"}
      </div>
    </div>
  );
}

function SessionActions({
  session,
  className,
  onDelete,
  showReview = true,
  compactDownload = false,
}: {
  session: SignedSession;
  className?: string;
  onDelete: (session: SignedSession) => void;
  showReview?: boolean;
  compactDownload?: boolean;
}) {
  return (
    <div className={`${className || ""} text-right`}>
      <div className="flex justify-end gap-2">
        {showReview ? (
          <Button
            variant="outline"
            onClick={() => {
              const reviewUrl = getReviewUrl(session);
              if (!reviewUrl) return;
              window.open(reviewUrl, "_blank");
            }}
            disabled={!getReviewUrl(session)}
          >
            Review
          </Button>
        ) : null}
        {compactDownload ? (
          <Button
            size="icon-sm"
            aria-label={`Download ${session.signerName || "signed copy"}`}
            onClick={() => {
              const downloadUrl = getDownloadUrl(session);
              if (!downloadUrl) return;
              window.open(downloadUrl, "_blank");
            }}
            disabled={!getDownloadUrl(session)}
          >
            <DownloadIcon />
          </Button>
        ) : (
          <Button
            onClick={() => {
              const downloadUrl = getDownloadUrl(session);
              if (!downloadUrl) return;
              window.open(downloadUrl, "_blank");
            }}
            disabled={!getDownloadUrl(session)}
          >
            <DownloadIcon data-icon="inline-start" />
            Download
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className=" hover:bg-red-500/10 text-red-300"
          onClick={() => onDelete(session)}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}

function sortByCompletedAt(a: SignedSession, b: SignedSession) {
  return getCompletedAt(b) - getCompletedAt(a);
}

function getLatestCompletedAt(sessions: SignedSession[]) {
  return Math.max(...sessions.map(getCompletedAt));
}

function getCompletedAt(session: SignedSession) {
  return session.completedAt ? new Date(session.completedAt).getTime() : 0;
}

function formatCompletedAt(session: SignedSession) {
  return session.completedAt
    ? format(new Date(session.completedAt), "PP")
    : "Just now";
}

function getReviewUrl(session: SignedSession) {
  if (session.finalizedFileUrl) return session.finalizedFileUrl;
  if (session.id.startsWith("packet-")) return undefined;
  return `/uploads/finalized_${session.id}.pdf`;
}

function getDownloadUrl(session: SignedSession) {
  if (session.finalizedFileUrl) return session.finalizedFileUrl;
  if (session.id.startsWith("packet-")) return undefined;
  return `/api/download/${session.id}`;
}
