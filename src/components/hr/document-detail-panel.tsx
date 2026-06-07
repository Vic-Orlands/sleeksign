"use client"

import { useMemo, useState } from "react"
import { CopyIcon, Edit3Icon, LinkIcon, SendIcon, ShieldCheckIcon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"

import { SignerTimeline } from "@/components/hr/signer-timeline"
import type { DocumentRecord } from "@/components/hr/types"
import { getDocumentCounts, getDocumentStatus } from "@/components/hr/types"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { areRoleConfigsEqual, type WorkflowMode } from "@/lib/field-utils"
import { useCurrentWorkspaceId } from "@/lib/workspace-store"

type PacketSummary = {
  id: string
  mode: WorkflowMode
  status: string
  roleConfigs: Array<{ name: string; scope: "shared" | "private" }>
}

type TeamRecord = {
  id: string
  name: string
}

type AuditRecord = {
  id: string
  eventType: string
  actorEmail?: string | null
  createdAt: string
  ipAddress?: string | null
}

type BulkSendJob = {
  id: string
  status: string
  totalRows: number
  createdCount: number
  sentCount: number
  signedCount: number
  failedCount: number
  rows?: Array<{
    id: string
    signerName?: string | null
    signerEmail: string
    roleName: string
    status: string
    shareUrl?: string | null
  }>
}

type DirectorySigner = {
  id: string
  name: string
  email: string
}

type SignerGroupRecord = {
  id: string
  name: string
  signers: DirectorySigner[]
}

type BulkBusyAction = "" | "parse" | "send" | "draft"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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
  const [isCreatingPacket, setIsCreatingPacket] = useState(false)
  const [selectedMode, setSelectedMode] = useState<WorkflowMode>("shared-base")
  const [documentOverrides, setDocumentOverrides] = useState<{
    documentId: string
    teamId: string | null
    requireOtp: boolean | null
  }>({
    documentId: "",
    teamId: null,
    requireOtp: null,
  })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<Array<Record<string, unknown>>>([])
  const [csvText, setCsvText] = useState("")
  const [nameColumn, setNameColumn] = useState("name")
  const [emailColumn, setEmailColumn] = useState("email")
  const [roleColumn, setRoleColumn] = useState("role")
  const [defaultRoleName, setDefaultRoleName] = useState("")
  const [bulkBusyAction, setBulkBusyAction] = useState<BulkBusyAction>("")
  const [sendPath, setSendPath] = useState<"email" | "signer" | "group">("email")
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [selectedSignerId, setSelectedSignerId] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [sendRoleName, setSendRoleName] = useState("")
  const [sendBusy, setSendBusy] = useState(false)
  const workspaceId = useCurrentWorkspaceId()
  const bulkBusy = Boolean(bulkBusyAction)

  // 1. Packets SWR
  const { data: packetsData, mutate: mutatePackets } = useSWR<PacketSummary[]>(
    document ? `/api/signing-packets?documentId=${encodeURIComponent(document.id)}` : null,
    fetcher
  )
  const packets = packetsData || []

  // 2. Audit logs SWR
  const { data: auditData } = useSWR<AuditRecord[]>(
    document && workspaceId
      ? `/api/audit?documentId=${encodeURIComponent(document.id)}&workspaceId=${encodeURIComponent(workspaceId)}`
      : null,
    fetcher
  )
  const auditLogs = auditData || []

  // 3. Bulk send jobs SWR
  const { data: jobsData, mutate: mutateJobs } = useSWR<BulkSendJob[]>(
    document ? `/api/bulk-send/jobs?documentId=${encodeURIComponent(document.id)}` : null,
    fetcher
  )
  const jobs = jobsData || []

  // 4. Teams, Signers, Groups SWR
  const { data: teamsData } = useSWR<{ teams: TeamRecord[] }>(
    workspaceId ? `/api/teams?workspaceId=${encodeURIComponent(workspaceId)}` : null,
    fetcher
  )
  const teams = teamsData?.teams || []

  const { data: signerData } = useSWR<{ signers: DirectorySigner[] }>(
    workspaceId ? `/api/signers/directory?workspaceId=${encodeURIComponent(workspaceId)}` : null,
    fetcher
  )
  const directorySigners = signerData?.signers || []

  const { data: groupData } = useSWR<{ groups: SignerGroupRecord[] }>(
    workspaceId ? `/api/signer-groups?workspaceId=${encodeURIComponent(workspaceId)}` : null,
    fetcher
  )
  const signerGroups = groupData?.groups || []

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
  const privateRoles = roleConfigs.filter((role) => role.scope === "private")
  const selectedTeamId =
    documentOverrides.documentId === document.id
      ? documentOverrides.teamId ?? document.teamId ?? ""
      : document.teamId ?? ""
  const requireOtp =
    documentOverrides.documentId === document.id
      ? documentOverrides.requireOtp ?? Boolean(document.requireOtp)
      : Boolean(document.requireOtp)

  async function persistDocumentSettings(next: {
    teamId?: string | null
    requireOtp?: boolean
  }) {
    if (!document) return

    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: "PUT",
        body: JSON.stringify({
          teamId: next.teamId ?? selectedTeamId ?? null,
          requireOtp: typeof next.requireOtp === "boolean" ? next.requireOtp : requireOtp,
        }),
      })
      if (!res.ok) throw new Error("Unable to update document")
      toast.success("Document settings updated")
    } catch {
      toast.error("Unable to update document settings")
    }
  }

  async function parseCsvPreview() {
    if (!csvFile || !document) {
      toast.error("Choose a CSV file first")
      return
    }

    const formData = new FormData()
    formData.append("file", csvFile)
    formData.append("documentId", document.id)
    formData.append("nameColumn", nameColumn)
    formData.append("emailColumn", emailColumn)
    formData.append("roleColumn", roleColumn)
    formData.append("defaultRoleName", defaultRoleName)

    setBulkBusyAction("parse")
    try {
      const res = await fetch("/api/bulk-send/parse", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to parse CSV")
      setCsvPreview(Array.isArray(data.preview?.recipients) ? data.preview.recipients : [])
      setCsvText(String(data.csvText || ""))
      toast.success("CSV parsed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to parse CSV")
    } finally {
      setBulkBusyAction("")
    }
  }

  async function createBulkJob(sendImmediately: boolean) {
    if (!csvText || !document) {
      toast.error("Parse a CSV file before creating a bulk send job")
      return
    }

    setBulkBusyAction(sendImmediately ? "send" : "draft")
    try {
      const res = await fetch("/api/bulk-send/jobs", {
        method: "POST",
        body: JSON.stringify({
          documentId: document.id,
          mode: selectedMode,
          csvText,
          csvFileName: csvFile?.name || "recipients.csv",
          mapping: {
            nameColumn,
            emailColumn,
            roleColumn: roleColumn || undefined,
            defaultRoleName: defaultRoleName || undefined,
          },
          sendImmediately,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to create job")
      toast.success(sendImmediately ? "Bulk send started" : "Bulk draft created")
      const jobsRes = await fetch(`/api/bulk-send/jobs?documentId=${encodeURIComponent(document.id)}`)
      const jobsData = await jobsRes.json()
      void mutateJobs(Array.isArray(jobsData) ? jobsData : [], false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create job")
    } finally {
      setBulkBusyAction("")
    }
  }

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
      void mutatePackets([packet, ...packets], false)
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

  async function sendDocumentNow() {
    if (!document) return

    const roleName = sendRoleName || privateRoles[0]?.name || roleConfigs[0]?.name || ""
    if (!roleName) {
      toast.error("Choose a signer role before sending")
      return
    }

    const targets =
      sendPath === "email"
        ? recipientEmail.trim()
          ? [{ kind: "email", name: recipientName.trim() || roleName, email: recipientEmail.trim(), roleName }]
          : []
        : sendPath === "signer"
          ? selectedSignerId
            ? [{ kind: "signer", signerId: selectedSignerId, roleName }]
            : []
          : selectedGroupId
            ? [{ kind: "group", groupId: selectedGroupId, roleName }]
            : []

    if (targets.length === 0) {
      toast.error("Choose a recipient before sending")
      return
    }

    setSendBusy(true)
    try {
      const res = await fetch("/api/send-document", {
        method: "POST",
        body: JSON.stringify({
          documentId: document.id,
          mode: selectedMode,
          targets,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to send document")
      toast.success("Document sent")
      setRecipientName("")
      setRecipientEmail("")
      setSelectedSignerId("")
      setSelectedGroupId("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send document")
    } finally {
      setSendBusy(false)
    }
  }

  return (
    <aside className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-x-hidden bg-card">
      <div className="px-5 pb-3 pt-5">
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

      <div className="min-h-0 overflow-auto px-5 pb-5">
        <Tabs defaultValue="overview" className="min-w-0 flex flex-col gap-4">
          <TabsList className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Send</TabsTrigger>
            <TabsTrigger value="activity">Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="m-0 flex flex-col gap-6 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <PanelMetric label="Status" value={status} />
              <PanelMetric label="Fields" value={`${counts.fields}`} />
              <PanelMetric label="Pending" value={`${counts.pending}/${Math.max(counts.total, 1)}`} />
              <PanelMetric label="Completed" value={`${counts.completed}/${Math.max(counts.total, 1)}`} />
            </div>
            <div className="grid gap-4 rounded-3xl bg-muted/35 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-orange-500" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Overview
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PanelStat label="Document ID" value={document.id.slice(0, 10)} />
                <PanelStat label="File type" value={document.name.split(".").pop()?.toUpperCase() || "PDF"} />
                <PanelStat label="Team" value={teams.find((team) => team.id === selectedTeamId)?.name || "Unassigned"} />
                <PanelStat label="Verification" value={requireOtp ? "Email OTP required" : "No OTP"} />
              </div>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Team ownership</span>
                <select
                  value={selectedTeamId}
                  onChange={(event) => {
                    const nextTeamId = event.target.value
                    setDocumentOverrides((current) => ({
                      documentId: document.id,
                      teamId: nextTeamId,
                      requireOtp:
                        current.documentId === document.id
                          ? current.requireOtp
                          : Boolean(document.requireOtp),
                    }))
                    void persistDocumentSettings({ teamId: nextTeamId || null })
                  }}
                  className="rounded-2xl bg-background px-3 py-2.5"
                >
                  <option value="">Unassigned</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-background px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">Require email OTP before viewing</p>
                  <p className="text-muted-foreground">
                    Signers must verify a 6-digit email code before the document loads.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requireOtp}
                  onChange={(event) => {
                    const nextValue = event.target.checked
                    setDocumentOverrides((current) => ({
                      documentId: document.id,
                      teamId:
                        current.documentId === document.id
                          ? current.teamId
                          : document.teamId ?? "",
                      requireOtp: nextValue,
                    }))
                    void persistDocumentSettings({ requireOtp: nextValue })
                  }}
                  className="size-4"
                />
              </label>
            </div>
            <div className="rounded-3xl bg-background/80 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                  <SendIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest">Ready to share</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Send this link after the field layout is ready. Signers will enter their details, complete required fields, and generate the signed PDF.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={onEdit}>
                  <Edit3Icon data-icon="inline-start" />
                  Back to Editor
                </Button>
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
              </div>
              {!canShare ? (
                <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-destructive">
                  Assign every field before sharing links.
                </p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="link" className="m-0 flex flex-col gap-4">
            <div className="rounded-3xl bg-background p-4 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Send document
              </p>
              <div className="mt-3 grid gap-3">
                <div className="grid grid-cols-3 gap-2">
                  {(["email", "signer", "group"] as const).map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => setSendPath(path)}
                      className={`rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                        sendPath === path
                          ? "bg-muted text-foreground"
                          : "bg-muted/35 hover:bg-muted/60"
                      }`}
                    >
                      {path === "email" ? "Single email" : path === "signer" ? "Single signer" : "Group"}
                    </button>
                  ))}
                </div>
                {sendPath === "email" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={recipientName}
                      onChange={(event) => setRecipientName(event.target.value)}
                      placeholder="Recipient name"
                      className="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                    />
                    <input
                      value={recipientEmail}
                      onChange={(event) => setRecipientEmail(event.target.value)}
                      placeholder="Recipient email"
                      className="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                    />
                  </div>
                ) : null}
                {sendPath === "signer" ? (
                  <select
                    value={selectedSignerId}
                    onChange={(event) => setSelectedSignerId(event.target.value)}
                    className="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  >
                    <option value="">Choose a workspace signer</option>
                    {directorySigners.map((signer) => (
                      <option key={signer.id} value={signer.id}>
                        {signer.name} · {signer.email}
                      </option>
                    ))}
                  </select>
                ) : null}
                {sendPath === "group" ? (
                  <select
                    value={selectedGroupId}
                    onChange={(event) => setSelectedGroupId(event.target.value)}
                    className="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  >
                    <option value="">Choose a signer group</option>
                    {signerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} · {group.signers.length} signers
                      </option>
                    ))}
                  </select>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    value={sendRoleName}
                    onChange={(event) => setSendRoleName(event.target.value)}
                    className="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  >
                    <option value="">Choose recipient role</option>
                    {privateRoles.map((role) => (
                      <option key={role.name} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    disabled={!canShare || sendBusy}
                    loading={sendBusy}
                    loadingText="Sending..."
                    onClick={() => void sendDocumentNow()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
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
                  className={`rounded-3xl px-4 py-3 text-left transition-colors ${
                    selectedMode === option.mode
                      ? "bg-muted"
                      : "bg-background hover:bg-muted/30"
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
            <div className="rounded-3xl bg-muted/35 p-4">
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
                  loading={isCreatingPacket}
                  loadingText="Creating..."
                  onClick={() =>
                    guardShareAction(() => {
                      void ensurePacket(selectedMode)
                    })
                  }
                >
                  {selectedPacket ? "Reuse Packet" : "Create Packet"}
                </Button>
              </div>
            </div>
            {selectedPacket ? (
              <div className="grid gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Role links
                </p>
                {getPacketRoleLinks(selectedPacket).map(({ role, url }) => (
                  <div key={`${selectedPacket.id}-${role.name}`} className="grid min-w-0 grid-cols-1 gap-2 rounded-3xl bg-background p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto]">
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

          <TabsContent value="bulk" className="m-0 flex flex-col gap-4">
            <div className="rounded-3xl bg-background p-4 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                CSV upload
              </p>
              <div className="mt-3 grid gap-3">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
                  className="text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={nameColumn}
                    onChange={(event) => setNameColumn(event.target.value)}
                    placeholder="Name column"
                    className="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  />
                  <input
                    value={emailColumn}
                    onChange={(event) => setEmailColumn(event.target.value)}
                    placeholder="Email column"
                    className="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  />
                  <input
                    value={roleColumn}
                    onChange={(event) => setRoleColumn(event.target.value)}
                    placeholder="Role column"
                    className="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  />
                  <select
                    value={defaultRoleName}
                    onChange={(event) => setDefaultRoleName(event.target.value)}
                    className="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  >
                    <option value="">Default role (optional)</option>
                    {privateRoles.map((role) => (
                      <option key={role.name} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={bulkBusy}
                    loading={bulkBusyAction === "parse"}
                    loadingText="Parsing..."
                    onClick={() => void parseCsvPreview()}
                  >
                    <UploadIcon data-icon="inline-start" />
                    Parse CSV
                  </Button>
                  <Button
                    disabled={bulkBusy || !csvText}
                    loading={bulkBusyAction === "send"}
                    loadingText="Sending..."
                    onClick={() => void createBulkJob(true)}
                  >
                    Send now
                  </Button>
                  <Button
                    variant="outline"
                    disabled={bulkBusy || !csvText}
                    loading={bulkBusyAction === "draft"}
                    loadingText="Saving..."
                    onClick={() => void createBulkJob(false)}
                  >
                    Save draft
                  </Button>
                </div>
              </div>
            </div>

            {csvPreview.length > 0 ? (
              <div className="rounded-3xl bg-background p-4 shadow-sm">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Preview
                </p>
                <div className="mt-3 grid gap-2">
                  {csvPreview.slice(0, 5).map((row, index) => (
                    <div key={`${String(row.signerEmail || index)}-${index}`} className="rounded-2xl bg-muted/35 px-3 py-2 text-sm">
                      {String(row.signerName || "Recipient")} · {String(row.roleName || "Role")} · {String(row.signerEmail || "")}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl bg-background p-4 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Job status
              </p>
              <div className="mt-3 grid gap-2">
                {jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bulk send jobs yet.</p>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="rounded-2xl bg-muted/35 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {job.status}
                      </p>
                      <p className="mt-2 text-sm">
                        {job.createdCount}/{job.totalRows} created · {job.sentCount} sent · {job.failedCount} failed
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="m-0 flex flex-col gap-4">
            <div>
              <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest">Audit trail</h3>
              <div className="grid gap-2">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No audit events yet.</p>
                ) : (
                  auditLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="rounded-2xl bg-background p-3 shadow-sm">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {log.eventType}
                      </p>
                      <p className="mt-1 text-sm">
                        {log.actorEmail || "system"} · {new Date(log.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">IP {log.ipAddress || "N/A"}</p>
                    </div>
                  ))
                )}
              </div>
              <Separator className="my-4" />
              <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest">Signer Timeline</h3>
              <SignerTimeline sessions={document.sessions || []} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid gap-3 px-5 pb-5">
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
    <div className="rounded-3xl bg-background p-3 shadow-sm">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 truncate font-mono text-sm text-foreground">{value}</p>
    </div>
  )
}

function PanelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background px-3 py-3">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export { DocumentDetailPanel }
