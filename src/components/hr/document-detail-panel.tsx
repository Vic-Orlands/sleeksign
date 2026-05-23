"use client"

import { useEffect, useMemo, useState } from "react"
import { CopyIcon, Edit3Icon, LinkIcon, SendIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { SignerTimeline } from "@/components/hr/signer-timeline"
import type { DocumentRecord } from "@/components/hr/types"
import { getDocumentCounts, getDocumentStatus } from "@/components/hr/types"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { areRoleConfigsEqual, type WorkflowMode } from "@/lib/field-utils"

type PacketSummary = {
  id: string
  mode: WorkflowMode
  status: string
  roleConfigs: Array<{ name: string; scope: "shared" | "private" }>
}

function DocumentDetailPanel({
  document,
  canShare = true,
  onEdit,
  onClose,
}: {
  document?: DocumentRecord
  canShare?: boolean
  onEdit: () => void
  onClose?: () => void
}) {
  const [packets, setPackets] = useState<PacketSummary[]>([])
  const [isCreatingPacket, setIsCreatingPacket] = useState(false)
  const [selectedMode, setSelectedMode] = useState<WorkflowMode>("shared-base")

  useEffect(() => {
    if (!document) return

    fetch(`/api/signing-packets?documentId=${encodeURIComponent(document.id)}`)
      .then((res) => res.json())
      .then((data) => {
        setPackets(Array.isArray(data) ? data : [])
      })
      .catch(() => undefined)
  }, [document])

  const roleConfigs = useMemo(
    () => document?.roleConfigs || [],
    [document?.roleConfigs],
  )

  const selectedPacket = useMemo(
    () =>
      document
        ? packets.find(
            (packet) =>
              packet.mode === selectedMode &&
              areRoleConfigsEqual(packet.roleConfigs, roleConfigs),
          ) || null
        : null,
    [document, packets, roleConfigs, selectedMode],
  )

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

  function guardShareAction(action: () => void) {
    if (!canShare) {
      toast.error("Assign all fields before sharing this document")
      return
    }

    action()
  }

  async function ensurePacket(mode: WorkflowMode) {
    if (!document) return null

    const existingPacket = packets.find(
      (packet) =>
        packet.mode === mode &&
        areRoleConfigsEqual(packet.roleConfigs, roleConfigs),
    )
    if (existingPacket) return existingPacket

    setIsCreatingPacket(true)
    try {
      const res = await fetch("/api/signing-packets", {
        method: "POST",
        body: JSON.stringify({
          documentId: document.id,
          mode,
          roleConfigs,
        }),
      })
      const data = await res.json()
      if (!data.packetId) throw new Error("Failed to create packet")

      const packet: PacketSummary = {
        id: data.packetId,
        mode,
        status: "active",
        roleConfigs,
      }
      setPackets((current) => [packet, ...current])
      toast.success("Share packet created")
      return packet
    } catch {
      toast.error("Unable to create share packet")
      return null
    } finally {
      setIsCreatingPacket(false)
    }
  }

  function getPacketRoleLinks(packet: PacketSummary) {
    return packet.roleConfigs.map((role) => ({
      role,
      url: `${publicUrl}?packet=${encodeURIComponent(packet.id)}&role=${encodeURIComponent(role.name)}`,
    }))
  }

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
            <div className="grid gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Choose a workflow model
              </p>
              {[
                {
                  mode: "collaborative" as WorkflowMode,
                  title: "Collaborative Packet",
                  copy: "Everyone signs the same live document and sees the other shared signers on the same PDF.",
                },
                {
                  mode: "individual" as WorkflowMode,
                  title: "Individual Copies",
                  copy: "Each signer gets a clean isolated copy. Nobody sees any other signer on their document.",
                },
                {
                  mode: "shared-base" as WorkflowMode,
                  title: "Shared Base + Recipient Copies",
                  copy: "Shared roles sign once, then each recipient signs their own copy with those shared signatures already visible.",
                },
              ].map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setSelectedMode(option.mode)}
                  className={`border px-4 py-3 text-left transition-colors ${
                    selectedMode === option.mode
                      ? "border-foreground bg-muted"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {option.mode}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{option.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{option.copy}</p>
                </button>
              ))}
            </div>
            <div className="border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Active packet
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {selectedPacket
                      ? `Packet ${selectedPacket.id.slice(0, 10)}`
                      : "No packet matches the current role setup yet."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={!canShare || isCreatingPacket}
                  onClick={() =>
                    guardShareAction(() => {
                      void ensurePacket(selectedMode)
                    })
                  }
                >
                  {isCreatingPacket ? "Creating..." : selectedPacket ? "Reuse Packet" : "Create Packet"}
                </Button>
              </div>
            </div>
            {selectedPacket ? (
              <div className="grid gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Role links
                </p>
                {getPacketRoleLinks(selectedPacket).map(({ role, url }) => (
                  <div key={`${selectedPacket.id}-${role.name}`} className="grid min-w-0 grid-cols-1 gap-2 border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {role.name} · {role.scope === "shared" ? "Shared" : "Private"}
                      </p>
                      <p className="mt-1 truncate font-mono text-xs text-foreground">{url}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={!canShare}
                      onClick={() =>
                        guardShareAction(() => {
                          navigator.clipboard.writeText(url)
                          toast.success(`${role.name} link copied`)
                        })
                      }
                    >
                      <CopyIcon data-icon="inline-start" />
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
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
          disabled={!canShare || !selectedPacket}
          onClick={() =>
            guardShareAction(() => {
              if (!selectedPacket) {
                toast.error("Create a packet before copying links")
                return
              }
              navigator.clipboard.writeText(
                `${publicUrl}?packet=${encodeURIComponent(selectedPacket.id)}`,
              )
              toast.success("Packet link copied")
            })
          }
        >
          <LinkIcon data-icon="inline-start" />
          Copy Packet Link
        </Button>
        {!canShare ? (
          <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">
            Assign every field before sharing links.
          </p>
        ) : null}
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
