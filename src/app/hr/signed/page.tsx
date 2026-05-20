"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { DownloadIcon, MailIcon } from "lucide-react"
import { toast } from "sonner"

import { HrShell } from "@/components/hr/hr-shell"
import { StatusBadge } from "@/components/hr/status-badge"
import type { DocumentRecord, SessionRecord } from "@/components/hr/types"
import { getDocumentStatus } from "@/components/hr/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentWorkspaceId } from "@/lib/workspace-store"

type SignedSession = SessionRecord & {
  documentName: string
}

export default function SignedDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const workspaceId = useCurrentWorkspaceId()
  const visibleDocuments = useMemo(() => (workspaceId ? documents : []), [documents, workspaceId])

  function normalizeDocuments(data: unknown) {
    return Array.isArray(data) ? (data as DocumentRecord[]) : []
  }

  useEffect(() => {
    if (!workspaceId) return

    const fetchWorkspaceDocuments = (options?: { background?: boolean }) => {
      if (!options?.background) setIsLoading(true)
      fetch(`/api/documents?workspaceId=${encodeURIComponent(workspaceId)}`)
        .then((res) => res.json())
        .then((data: unknown) => setDocuments(normalizeDocuments(data)))
        .finally(() => {
          if (!options?.background) setIsLoading(false)
        })
    }

    fetchWorkspaceDocuments()
    const interval = window.setInterval(
      () => fetchWorkspaceDocuments({ background: true }),
      5000,
    )
    return () => window.clearInterval(interval)
  }, [workspaceId])

  function fetchDocuments(options?: { background?: boolean }) {
    if (!workspaceId) {
      if (!options?.background) setIsLoading(false)
      return
    }

    if (!options?.background) setIsLoading(true)
    fetch(`/api/documents?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then((res) => res.json())
      .then((data: unknown) => setDocuments(normalizeDocuments(data)))
      .finally(() => {
        if (!options?.background) setIsLoading(false)
      })
  }

  const signedSessions = useMemo(
    () => {
      return visibleDocuments.flatMap((document) =>
        (document.sessions || [])
          .filter((session) => session.status === "completed")
          .map((session) => ({
            ...session,
            documentName: document.name,
          })),
      )
    },
    [visibleDocuments],
  )

  const filteredSessions = signedSessions.filter((session) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [session.documentName, session.signerName, session.signerEmail]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle))
  })

  const allSessions = visibleDocuments.flatMap((document) => document.sessions || [])
  const completedCount = allSessions.filter((session) => session.status === "completed").length
  const pendingCount = allSessions.filter((session) => session.status === "pending").length
  const inProgressCount = visibleDocuments.filter((document) => getDocumentStatus(document) === "In Progress").length

  async function handleUpload(file: File) {
    if (!workspaceId) {
      toast.error("Select a workspace first")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("workspaceId", workspaceId)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!data.id) throw new Error("Upload failed")
      toast.success("Document uploaded")
      await fetchDocuments()
      window.location.href = `/hr/documents/${data.id}`
    } catch {
      toast.error("Upload failed")
    }
  }

  return (
    <HrShell
      query={query}
      onQueryChange={setQuery}
      onUpload={handleUpload}
      activeView="signed"
      pendingCount={pendingCount}
      inProgressCount={inProgressCount}
      completedCount={completedCount}
    >
      <section className="min-h-0 overflow-auto bg-[var(--paper)]">
        <div className="flex flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-mono text-xs font-semibold uppercase tracking-widest">Signed Docs</h1>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {filteredSessions.length} of {signedSessions.length} completed signing sessions
            </p>
          </div>
        </div>

        {workspaceId && isLoading ? (
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
          <SignedDocsTable sessions={filteredSessions} />
        )}
      </section>
    </HrShell>
  )
}

function SignedDocsTable({ sessions }: { sessions: SignedSession[] }) {
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

        {sessions.length === 0 ? (
          <div className="m-4 flex h-52 items-center justify-center border border-dashed border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            No signed documents yet.
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="grid grid-cols-12 items-center gap-4 border-b border-border p-4 transition-colors hover:bg-secondary"
            >
              <div className="col-span-4">
                <div className="truncate text-[13px] font-bold text-foreground">{session.documentName}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Session {session.id.slice(0, 10)}
                </div>
              </div>
              <div className="col-span-3 space-y-1">
                <div className="text-[13px] font-bold text-foreground">{session.signerName || "Anonymous signer"}</div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  <MailIcon className="size-3" />
                  {session.signerEmail || "No email"}
                </div>
              </div>
              <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {session.completedAt ? format(new Date(session.completedAt), "PP") : "Just now"}
              </div>
              <div className="col-span-1">
                <StatusBadge status={session.status} />
              </div>
              <div className="col-span-2 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/uploads/finalized_${session.id}.pdf`, "_blank")}
                  >
                    Review
                  </Button>
                  <Button onClick={() => window.open(`/api/download/${session.id}`, "_blank")}>
                    <DownloadIcon data-icon="inline-start" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
