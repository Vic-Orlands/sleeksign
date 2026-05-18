"use client"

import { useEffect, useState } from "react"
import { ArrowLeftIcon, Loader2Icon } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

import { DocumentSetupDock } from "@/components/hr/document-setup-dock"
import type { DocumentRecord } from "@/components/hr/types"
import { Button } from "@/components/ui/button"
import type { Field } from "@/lib/field-utils"

export default function DocumentSetupPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [document, setDocument] = useState<DocumentRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((res) => res.json())
      .then((data) => setDocument(data))
      .finally(() => setIsLoading(false))
  }, [id])

  function updateFields(documentId: string, fields: Field[]) {
    setDocument((current) => (current?.id === documentId ? { ...current, fields } : current))
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Document not found.
      </div>
    )
  }

  return (
    <div className="grid h-screen grid-rows-[56px_minmax(0,1fr)] bg-[var(--paper)]">
      <header className="flex items-center justify-between border-b border-border bg-background px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/hr/documents")}>
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Focused setup</p>
            <h1 className="truncate font-mono text-xs font-semibold uppercase tracking-widest">{document.name}</h1>
          </div>
        </div>
      </header>
      <div className="min-h-0 p-4">
        <DocumentSetupDock document={document} onFieldsChange={updateFields} fullHeight />
      </div>
    </div>
  )
}
