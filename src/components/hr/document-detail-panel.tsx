"use client"

import { CopyIcon, Edit3Icon, LinkIcon, SendIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { SignerTimeline } from "@/components/hr/signer-timeline"
import type { DocumentRecord } from "@/components/hr/types"
import { getDocumentCounts, getDocumentStatus } from "@/components/hr/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function DocumentDetailPanel({
  document,
  onEdit,
  onClose,
}: {
  document?: DocumentRecord
  onEdit: () => void
  onClose?: () => void
}) {
  if (!document) {
    return (
      <aside className="min-h-[320px] min-w-0 border-t border-border bg-card p-4 xl:min-h-0 xl:border-l xl:border-t-0">
        <div className="flex h-full items-center justify-center border border-dashed border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Select a document.
        </div>
      </aside>
    )
  }

  const publicUrl = typeof window === "undefined" ? "" : `${window.location.origin}/sign/p/${document.id}`
  const counts = getDocumentCounts(document)
  const status = getDocumentStatus(document)

  return (
    <aside className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-x-hidden bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold uppercase tracking-widest">{document.name}</h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Share package</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <XIcon />
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-auto p-4">
        <Tabs defaultValue="overview" className="min-w-0 flex flex-col gap-4">
          <TabsList className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="m-0 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <PanelMetric label="Status" value={status} />
              <PanelMetric label="Fields" value={`${counts.fields}`} />
              <PanelMetric label="Pending" value={`${counts.pending}/${Math.max(counts.total, 1)}`} />
              <PanelMetric label="Completed" value={`${counts.completed}/${Math.max(counts.total, 1)}`} />
            </div>
            <div className="border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center border border-border bg-secondary text-muted-foreground">
                  <SendIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest">Ready to share</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Send this link after the field layout is ready. Signers will enter their details, complete required fields, and generate the signed PDF.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="link" className="m-0 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Share Link</label>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input value={publicUrl} readOnly className="min-w-0 font-mono text-xs" />
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl)
                    toast.success("Share link copied")
                  }}
                >
                  <CopyIcon data-icon="inline-start" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="border border-border bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Public signing route</p>
              <p className="mt-2 break-all font-mono text-xs text-foreground">{publicUrl}</p>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="m-0 flex flex-col gap-4">
            <div>
              <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest">Signer Timeline</h3>
              <SignerTimeline sessions={document.sessions || []} />
            </div>
          </TabsContent>

          <TabsContent value="details" className="m-0 flex flex-col gap-4">
            <PanelMetric label="Document ID" value={document.id.slice(0, 10)} />
            <PanelMetric label="File type" value={document.name.split(".").pop()?.toUpperCase() || "PDF"} />
            <Separator />
            <Button variant="outline" onClick={onEdit}>
              <Edit3Icon data-icon="inline-start" />
              Back to Editor
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid gap-3 border-t border-border p-4">
        <Button
          onClick={() => {
            navigator.clipboard.writeText(publicUrl)
            toast.success("Share link copied")
          }}
        >
          <LinkIcon data-icon="inline-start" />
          Copy Share Link
        </Button>
        <Button variant="outline" onClick={onEdit}>
          <Edit3Icon data-icon="inline-start" />
          Continue Editing
        </Button>
      </div>
    </aside>
  )
}

function PanelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background p-3">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 truncate font-mono text-sm text-foreground">{value}</p>
    </div>
  )
}

export { DocumentDetailPanel }
