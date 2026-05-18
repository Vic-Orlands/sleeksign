"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { MailIcon, UsersIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { DocumentTable } from "@/components/hr/document-table"
import { HrShell } from "@/components/hr/hr-shell"
import { StatusBadge } from "@/components/hr/status-badge"
import type { DocumentRecord, DocumentSetupStatus, SessionRecord } from "@/components/hr/types"
import { getDocumentSetupStatus, getDocumentStatus } from "@/components/hr/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type TableFilter = "all" | "shared" | "signers" | DocumentSetupStatus

export default function HRDocuments() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [query, setQuery] = useState("")
  const [tableFilter, setTableFilter] = useState<TableFilter>("all")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDocuments()
    const interval = window.setInterval(() => fetchDocuments({ background: true }), 5000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      if (window.location.search.includes("view=shared")) setTableFilter("shared")
      if (window.location.search.includes("view=signers")) setTableFilter("signers")
    })
  }, [])

  function fetchDocuments(options?: { background?: boolean }) {
    if (!options?.background) setIsLoading(true)
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data: DocumentRecord[]) => {
        setDocuments(data)
      })
      .finally(() => {
        if (!options?.background) setIsLoading(false)
      })
  }

  const filteredDocuments = useMemo(
    () =>
      documents.filter((document) => {
        const matchesQuery = document.name.toLowerCase().includes(query.trim().toLowerCase())
        if (!matchesQuery) return false
        if (tableFilter === "all") return true
        if (tableFilter === "shared") return Boolean(document.sessions?.length)
        if (tableFilter === "signers") return true
        return getDocumentSetupStatus(document) === tableFilter
      }),
    [documents, query, tableFilter],
  )

  const allSessions = documents.flatMap((document) => document.sessions || [])
  const signerRows = documents.flatMap((document) =>
    (document.sessions || []).map((session) => ({
      ...session,
      documentName: document.name,
    })),
  )
  const filteredSigners = signerRows.filter((session) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [session.signerName, session.signerEmail, session.documentName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle))
  })
  const completedCount = allSessions.filter((session) => session.status === "completed").length
  const pendingCount = allSessions.filter((session) => session.status === "pending").length
  const inProgressCount = documents.filter((document) => getDocumentStatus(document) === "In Progress").length

  async function handleUpload(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!data.id) throw new Error("Upload failed")
      toast.success("Document uploaded")
      await fetchDocuments()
      router.push(`/hr/documents/${data.id}`)
    } catch {
      toast.error("Upload failed")
    }
  }

  return (
    <HrShell
      query={query}
      onQueryChange={setQuery}
      onUpload={handleUpload}
      activeView={tableFilter === "shared" ? "shared" : tableFilter === "signers" ? "signers" : "documents"}
      onSharedActivityClick={() => setTableFilter("shared")}
      onSignersClick={() => setTableFilter("signers")}
      pendingCount={pendingCount}
      inProgressCount={inProgressCount}
      completedCount={completedCount}
    >
      <section className="min-h-0 overflow-auto bg-[var(--paper)]">
        <div className="flex flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-mono text-xs font-semibold uppercase tracking-widest">
              {tableFilter === "signers" ? "Signer Management" : tableFilter === "shared" ? "Shared Activity" : "All Documents"}
            </h1>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {tableFilter === "signers"
                ? `${filteredSigners.length} of ${signerRows.length} signers`
                : `${filteredDocuments.length} of ${documents.length} documents`}
            </p>
          </div>
          {tableFilter === "signers" ? (
            <Button variant="outline">
              <UsersIcon data-icon="inline-start" />
              New Signer
            </Button>
          ) : tableFilter === "shared" ? null : (
            <div className="flex overflow-x-auto border border-border bg-card">
              <FilterButton value="all" tableFilter={tableFilter} onSelect={setTableFilter}>
                All
              </FilterButton>
              <FilterButton value="Needs Setup" tableFilter={tableFilter} onSelect={setTableFilter}>
                Needs Setup
              </FilterButton>
              <FilterButton value="Edited" tableFilter={tableFilter} onSelect={setTableFilter}>
                Edited
              </FilterButton>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-2 px-5 py-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : tableFilter === "signers" ? (
          <SignerTable sessions={filteredSigners} />
        ) : filteredDocuments.length === 0 ? (
          <div className="mx-5 my-5 flex h-52 items-center justify-center border border-dashed border-border bg-card font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            No documents match this search.
          </div>
        ) : (
          <div className="overflow-x-auto px-4 py-4 sm:px-5">
            <DocumentTable
              documents={filteredDocuments}
              variant={tableFilter === "shared" ? "shared" : "documents"}
              onSelectDocument={(document) => router.push(`/hr/documents/${document.id}`)}
            />
          </div>
        )}
      </section>
    </HrShell>
  )
}

function SignerTable({
  sessions,
}: {
  sessions: Array<SessionRecord & { documentName: string }>
}) {
  return (
    <div className="overflow-x-auto px-4 py-4 sm:px-5">
      <div className="min-w-[760px] border border-border bg-background text-[11px]">
        <div className="grid grid-cols-12 gap-4 border-b border-border bg-secondary p-4 font-mono uppercase tracking-tight text-muted-foreground">
          <div className="col-span-3">Name / Role</div>
          <div className="col-span-4">Contact</div>
          <div className="col-span-2">Docs Signed</div>
          <div className="col-span-3 text-right">Status</div>
        </div>

        {sessions.length === 0 ? (
          <div className="flex h-52 items-center justify-center border border-dashed border-border m-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            No current signers.
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="grid grid-cols-12 items-center gap-4 border-b border-border p-4 transition-colors hover:bg-secondary"
            >
              <div className="col-span-3">
                <div className="text-[13px] font-bold text-foreground">{session.signerName || "Anonymous signer"}</div>
                <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {session.documentName}
                </div>
              </div>
              <div className="col-span-4 space-y-1 font-mono text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MailIcon className="size-3 text-muted-foreground" />
                  {session.signerEmail || "No email"}
                </div>
                <div className="text-[10px] uppercase tracking-widest">
                  Started {format(new Date(session.createdAt), "PP")}
                </div>
              </div>
              <div className="col-span-2 font-mono text-[13px] text-foreground">
                {session.status === "completed" ? "1" : "0"}
              </div>
              <div className="col-span-3 text-right">
                <StatusBadge status={session.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function FilterButton({
  value,
  tableFilter,
  onSelect,
  children,
}: {
  value: TableFilter
  tableFilter: TableFilter
  onSelect: (filter: TableFilter) => void
  children: ReactNode
}) {
  return (
    <Button
      variant={tableFilter === value ? "secondary" : "ghost"}
      size="sm"
      className="shrink-0 border-0"
      onClick={() => onSelect(value)}
    >
      {children}
    </Button>
  )
}
