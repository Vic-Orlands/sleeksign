"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import {
  MailIcon,
  Trash2Icon,
  UsersIcon,
  PlusIcon,
  FolderIcon,
  ActivityIcon,
  BriefcaseIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"

import { HrShell } from "@/components/hr/hr-shell"
import { StatusBadge } from "@/components/hr/status-badge"
import type { DocumentRecord, SessionRecord } from "@/components/hr/types"
import { getDocumentStatus } from "@/components/hr/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentWorkspaceId } from "@/lib/workspace-store"

interface SignerGroup {
  id: string
  name: string
  description?: string | null
  teamId?: string | null
  signers?: Array<{
    id: string
    name: string
    email: string
  }>
}

interface DirectorySigner {
  id: string
  name: string
  email: string
  title?: string | null
  status?: string
  teamId?: string | null
  teamName?: string | null
}

interface TeamPayload {
  id: string
  name: string
  isDefault?: boolean
}

interface MemberPayload {
  id: string
  userId: string
  role: string
  teamIds?: string[]
  user?: {
    name?: string | null
    email?: string | null
  }
}

type SignerTab = "directory" | "groups" | "activity"
type SignerBusyAction =
  | ""
  | "create-signer"
  | "create-group"
  | "delete-group"
  | "delete-directory-signer"
  | "delete-activity"

export default function HRSignersPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<SignerTab>("directory")
  const [isLoading, setIsLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<SignerBusyAction>("")
  const workspaceId = useCurrentWorkspaceId()
  const router = useRouter()

  const [signerGroups, setSignerGroups] = useState<SignerGroup[]>([])
  const [directorySigners, setDirectorySigners] = useState<DirectorySigner[]>([])
  const [teams, setTeams] = useState<TeamPayload[]>([])
  const [members, setMembers] = useState<MemberPayload[]>([])

  const [newSignerOpen, setNewSignerOpen] = useState(false)
  const [newSignerName, setNewSignerName] = useState("")
  const [newSignerEmail, setNewSignerEmail] = useState("")
  const [newSignerTitle, setNewSignerTitle] = useState("")
  const [newSignerTeamId, setNewSignerTeamId] = useState("")

  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [groupCreationStep, setGroupCreationStep] = useState<"details" | "members">("details")
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [newGroupTeamId, setNewGroupTeamId] = useState("")
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]) // contains email or signerId

  const [groupToDelete, setGroupToDelete] = useState<SignerGroup | null>(null)
  const [directorySignerToDelete, setDirectorySignerToDelete] = useState<DirectorySigner | null>(null)
  const [signerToDelete, setSignerToDelete] = useState<(SessionRecord & { documentName: string }) | null>(null)
  const isBusy = Boolean(busyAction)

  function normalizeDocuments(data: unknown) {
    return Array.isArray(data) ? (data as DocumentRecord[]) : []
  }

  useEffect(() => {
    if (!workspaceId) {
      queueMicrotask(() => {
        setDocuments([])
        setSignerGroups([])
        setDirectorySigners([])
        setTeams([])
        setMembers([])
        setIsLoading(false)
      })
      return
    }

    async function loadDocuments() {
      const response = await fetch(
        `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}&includeArchived=true&includeDeleted=true`,
      )
      const data: unknown = await response.json()
      setDocuments(normalizeDocuments(data))
    }

    async function loadSignerDirectoryData() {
      const [signerGroupsRes, directorySignersRes, teamsRes] = await Promise.all([
        fetch(`/api/signer-groups?workspaceId=${encodeURIComponent(workspaceId)}`),
        fetch(`/api/signers/directory?workspaceId=${encodeURIComponent(workspaceId)}`),
        fetch(`/api/teams?workspaceId=${encodeURIComponent(workspaceId)}`),
      ])
      const signerGroupsData = await signerGroupsRes.json()
      const directorySignersData = await directorySignersRes.json()
      const teamsData = await teamsRes.json()

      setSignerGroups(Array.isArray(signerGroupsData.groups) ? signerGroupsData.groups : [])
      setDirectorySigners(Array.isArray(directorySignersData.signers) ? directorySignersData.signers : [])
      setTeams(Array.isArray(teamsData.teams) ? teamsData.teams : [])
      setMembers(Array.isArray(teamsData.members) ? teamsData.members : [])
    }

    async function loadPageData(options?: { background?: boolean }) {
      if (!options?.background) setIsLoading(true)
      try {
        await Promise.all([loadDocuments(), loadSignerDirectoryData()])
      } catch (error) {
        console.error("Failed to load signers page data", error)
      } finally {
        if (!options?.background) setIsLoading(false)
      }
    }

    void loadPageData()

    const interval = window.setInterval(() => {
      void loadPageData({ background: true })
    }, 6000)

    return () => window.clearInterval(interval)
  }, [workspaceId])

  async function refreshSignerDirectoryData() {
    if (!workspaceId) return
    try {
      const [signerGroupsRes, directorySignersRes] = await Promise.all([
        fetch(`/api/signer-groups?workspaceId=${encodeURIComponent(workspaceId)}`),
        fetch(`/api/signers/directory?workspaceId=${encodeURIComponent(workspaceId)}`),
      ])
      const signerGroupsData = await signerGroupsRes.json()
      const directorySignersData = await directorySignersRes.json()
      setSignerGroups(Array.isArray(signerGroupsData.groups) ? signerGroupsData.groups : [])
      setDirectorySigners(Array.isArray(directorySignersData.signers) ? directorySignersData.signers : [])
    } catch {
      // Background reload fail silent
    }
  }

  async function createSigner() {
    if (!workspaceId || !newSignerName.trim() || !newSignerEmail.trim()) return
    setBusyAction("create-signer")
    try {
      const res = await fetch("/api/signers/directory", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          name: newSignerName.trim(),
          email: newSignerEmail.trim(),
          title: newSignerTitle.trim() || null,
          teamId: newSignerTeamId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to register signer")
      setNewSignerName("")
      setNewSignerEmail("")
      setNewSignerTitle("")
      setNewSignerTeamId("")
      setNewSignerOpen(false)
      toast.success("Signer registered successfully")
      await refreshSignerDirectoryData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to register signer")
    } finally {
      setBusyAction("")
    }
  }

  async function createSignerGroup() {
    if (!workspaceId || !newGroupName.trim()) return
    if (selectedGroupMembers.length === 0) {
      toast.error("Select at least one signer for the group")
      return
    }
    setBusyAction("create-group")
    try {
      const finalSignerIds: string[] = []

      for (const entryId of selectedGroupMembers) {
        const foundMember = members.find((m) => m.id === entryId)
        if (foundMember) {
          if (!foundMember.user?.email?.trim()) {
            throw new Error("Every selected workspace member must have an email address")
          }
          const matchedSigner = directorySigners.find((s) => s.email === foundMember.user?.email)
          if (matchedSigner) {
            finalSignerIds.push(matchedSigner.id)
          } else {
            const registerRes = await fetch("/api/signers/directory", {
              method: "POST",
              body: JSON.stringify({
                workspaceId,
                name: foundMember.user?.name || "Workspace Member",
                email: foundMember.user?.email || "",
                title: "Workspace Member",
                teamId: foundMember.teamIds?.[0] || null,
              }),
            })
            const registerData = await registerRes.json()
            if (!registerRes.ok) throw new Error(registerData.error || "Auto-register failed")
            finalSignerIds.push(registerData.id)
          }
        } else {
          finalSignerIds.push(entryId)
        }
      }

      const res = await fetch("/api/signer-groups", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          teamId: newGroupTeamId || null,
          signerIds: finalSignerIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to assemble signer group")
      
      setNewGroupName("")
      setNewGroupDescription("")
      setNewGroupTeamId("")
      setSelectedGroupMembers([])
      setNewGroupOpen(false)
      setGroupCreationStep("details")
      toast.success("Signer group assembled successfully")
      await refreshSignerDirectoryData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assemble signer group")
    } finally {
      setBusyAction("")
    }
  }

  async function deleteSignerGroup() {
    if (!workspaceId || !groupToDelete) return
    setBusyAction("delete-group")
    try {
      const res = await fetch(`/api/signer-groups/${groupToDelete.id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to delete group")
      setGroupToDelete(null)
      toast.success("Signer group deleted successfully")
      await refreshSignerDirectoryData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete group")
    } finally {
      setBusyAction("")
    }
  }

  async function deleteDirectorySigner() {
    if (!workspaceId || !directorySignerToDelete) return
    setBusyAction("delete-directory-signer")
    try {
      const res = await fetch(
        `/api/signers/directory/${directorySignerToDelete.id}?workspaceId=${encodeURIComponent(workspaceId)}`,
        { method: "DELETE" },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to delete signer")
      setDirectorySignerToDelete(null)
      toast.success("Signer removed")
      await refreshSignerDirectoryData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete signer")
    } finally {
      setBusyAction("")
    }
  }

  async function deleteSignerActivity() {
    if (!signerToDelete) return
    setBusyAction("delete-activity")
    try {
      const res = await fetch(`/api/signers/${signerToDelete.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Signing record deleted")
      setSignerToDelete(null)
      const data = await fetch(
        `/api/documents?workspaceId=${encodeURIComponent(workspaceId || "")}&includeArchived=true&includeDeleted=true`,
      )
        .then((res) => res.json())
      setDocuments(normalizeDocuments(data))
    } catch {
      toast.error("Failed to delete activity record")
    } finally {
      setBusyAction("")
    }
  }

  const filteredDirectorySigners = useMemo(() => {
    return directorySigners.filter((signer) => {
      const needle = query.trim().toLowerCase()
      if (!needle) return true
      return [signer.name, signer.email, signer.title, signer.teamName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [directorySigners, query])

  const filteredGroups = useMemo(() => {
    return signerGroups.filter((group) => {
      const needle = query.trim().toLowerCase()
      if (!needle) return true
      return [group.name, group.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [signerGroups, query])

  const signerActivityRows = useMemo(() => {
    return documents.flatMap((document) =>
      (document.sessions || []).map((session) => ({
        ...session,
        documentName: document.name,
      })),
    )
  }, [documents])

  const filteredActivity = useMemo(() => {
    return signerActivityRows.filter((session) => {
      const needle = query.trim().toLowerCase()
      if (!needle) return true
      return [session.signerName, session.signerEmail, session.documentName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [signerActivityRows, query])

  const allSessions = documents.flatMap((doc) => doc.sessions || [])
  const completedCount = allSessions.filter((session) => session.status === "completed").length
  const pendingCount = allSessions.filter((session) => session.status === "pending").length
  const inProgressCount = documents.filter((doc) => getDocumentStatus(doc) === "In Progress").length

  return (
    <>
      <HrShell
        query={query}
        onQueryChange={setQuery}
        onUpload={() => {}} // Not uploading on signers tab, handled via route redirect if file dropped
        activeView="signers"
        onDocumentsClick={() => router.push("/hr/documents")}
        onSharedActivityClick={() => router.push("/hr/documents?view=shared")}
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
        completedCount={completedCount}
      >
        <section className="min-h-0 flex-1 overflow-auto bg-[var(--paper)]">
          <div className="flex flex-col gap-4 border-b border-border bg-background px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-orange-500 font-bold">Workspace Directory</p>
              <h1 className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-foreground">
                Signer Cockpit
              </h1>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                Manage corporate signing groups, register internal directories, and audit activity.
              </p>
            </div>
            
            <div className="flex gap-2.5 sm:self-end">
              <Button variant="outline" onClick={() => setNewGroupOpen(true)} className="h-9 px-4 font-mono text-xs uppercase tracking-wide border-border/60 shadow-xs">
                <PlusIcon data-icon="inline-start" className="size-3.5" />
                Assemble Group
              </Button>
              <Button onClick={() => setNewSignerOpen(true)} className="h-9 px-4 font-mono text-xs uppercase tracking-wide bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-xs">
                <UsersIcon data-icon="inline-start" className="size-3.5" />
                New Signer
              </Button>
            </div>
          </div>

          <div className="px-6 pt-5">
            <div className="flex border-b border-border/70 gap-6">
              <TabButton active={activeTab === "directory"} onClick={() => setActiveTab("directory")}>
                Directory ({directorySigners.length})
              </TabButton>
              <TabButton active={activeTab === "groups"} onClick={() => setActiveTab("groups")}>
                Signer Groups ({signerGroups.length})
              </TabButton>
              <TabButton active={activeTab === "activity"} onClick={() => setActiveTab("activity")}>
                Live Activity ({signerActivityRows.length})
              </TabButton>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "directory" && (
                  <motion.div
                    key="directory"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {filteredDirectorySigners.length === 0 ? (
                      <EmptyState
                        icon={UsersIcon}
                        title="Signers Directory Empty"
                        description="Add designees, legal signatories, or candidate mappings so documents can be routed to them instantly."
                        actionLabel="Register Designee"
                        onAction={() => setNewSignerOpen(true)}
                      />
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredDirectorySigners.map((signer) => (
                          <div
                            key={signer.id}
                            className="group relative flex flex-col border border-border/40 bg-card hover:bg-muted/10 p-5 shadow-xs transition-all hover:border-border duration-300"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center bg-primary/5 border border-primary/10 text-primary font-mono text-xs uppercase font-bold">
                                  {signer.name.substring(0, 2)}
                                </div>
                                <div>
                                  <h4 className="text-[13px] font-bold text-foreground">{signer.name}</h4>
                                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                    {signer.title || "Internal Signatory"}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setDirectorySignerToDelete(signer)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 border border-border/40 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 text-muted-foreground"
                                title="Remove Signer"
                              >
                                <Trash2Icon className="size-3.5" />
                              </button>
                            </div>
                            
                            <div className="mt-5 pt-4 border-t border-dashed border-border/40 space-y-2 font-mono text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <MailIcon className="size-3 text-muted-foreground/60" />
                                <span className="truncate">{signer.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <BriefcaseIcon className="size-3 text-muted-foreground/60" />
                                <span>Designation: {signer.teamName || "Global Workspace"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "groups" && (
                  <motion.div
                    key="groups"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {filteredGroups.length === 0 ? (
                      <EmptyState
                        icon={FolderIcon}
                        title="No Signer Groups"
                        description="Assemble departments or witness pools into corporate groups (e.g. Legal Counsel, CFO Desk) to route packets efficiently."
                        actionLabel="Assemble Group"
                        onAction={() => setNewGroupOpen(true)}
                      />
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {filteredGroups.map((group) => (
                          <div
                            key={group.id}
                            className="group flex flex-col border border-border/40 bg-card hover:bg-muted/10 p-5 shadow-xs transition-all hover:border-border duration-300 relative overflow-hidden"
                          >
                            {/* Colorful Left Border Stripe */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/80" />

                            <div className="flex items-start justify-between gap-3 pl-2">
                              <div>
                                <h4 className="text-xs font-bold text-foreground tracking-tight">{group.name}</h4>
                                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                                  {group.description || "No official group description provided."}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setGroupToDelete(group)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 border border-border/40 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 text-muted-foreground"
                                title="Dissemble Group"
                              >
                                <Trash2Icon className="size-3.5" />
                              </button>
                            </div>

                            {/* Signers Pile */}
                            <div className="mt-5 pt-4 border-t border-dashed border-border/40 pl-2 flex items-center justify-between">
                              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                                {group.signers?.length || 0} active members:
                              </span>
                              <div className="flex items-center gap-1">
                                {(group.signers || []).slice(0, 4).map((s) => (
                                  <span
                                    key={s.id}
                                    className="inline-flex size-6 items-center justify-center font-mono text-[8px] uppercase tracking-wider text-foreground bg-primary/5 border border-border/70"
                                    title={`${s.name} (${s.email})`}
                                  >
                                    {s.name.substring(0, 2)}
                                  </span>
                                ))}
                                {(group.signers?.length || 0) > 4 && (
                                  <span className="font-mono text-[9px] text-muted-foreground font-bold px-1">
                                    +{(group.signers?.length || 0) - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "activity" && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {filteredActivity.length === 0 ? (
                      <EmptyState
                        icon={ActivityIcon}
                        title="No Signing Activity"
                        description="Live logs of active, complete, and outstanding signing sessions will populate here as soon as packets are shared."
                        actionLabel="View Documents"
                        onAction={() => router.push("/hr/documents")}
                      />
                    ) : (
                      <div className="overflow-hidden border border-border bg-card shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-border bg-muted/40 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                <th className="p-4">Signer / Role</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4">Linked Document</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredActivity.map((session) => (
                                <tr
                                  key={session.id}
                                  className="border-b border-border/50 hover:bg-muted/10 transition-colors"
                                >
                                  <td className="p-4">
                                    <div className="text-[12px] font-bold text-foreground">
                                      {session.signerName || "Anonymous Signer"}
                                    </div>
                                    <div className="mt-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                                      {session.signerRole || "Contributor"}
                                    </div>
                                  </td>
                                  <td className="p-4 font-mono text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <MailIcon className="size-3 text-muted-foreground/60" />
                                      {session.signerEmail || "No designated email"}
                                    </div>
                                    <div className="mt-0.5 text-[8px] uppercase tracking-wider">
                                      Registered: {format(new Date(session.createdAt), "PP")}
                                    </div>
                                  </td>
                                  <td className="p-4 font-mono text-muted-foreground max-w-xs truncate">
                                    {session.documentName}
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="inline-flex justify-center">
                                      <StatusBadge status={session.status} />
                                    </div>
                                  </td>
                                  <td className="p-4 text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => setSignerToDelete(session)}
                                      className="hover:bg-destructive/5 text-destructive hover:border-destructive/20 border border-transparent"
                                      title="Delete Session"
                                    >
                                      <Trash2Icon className="size-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </section>
      </HrShell>

      <Dialog open={newSignerOpen} onOpenChange={(open) => {
        setNewSignerOpen(open)
        if (!open) {
          setNewSignerName("")
          setNewSignerEmail("")
          setNewSignerTitle("")
          setNewSignerTeamId("")
        }
      }}>
        <DialogContent className="border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest text-foreground flex items-center gap-2">
              <UsersIcon className="size-4 text-orange-500" />
              Register Signer
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Add a trusted internal signatory, witness, or contract reviewer to this workspace&apos;s permanent roster.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Full Name</label>
              <input
                value={newSignerName}
                onChange={(e) => setNewSignerName(e.target.value)}
                placeholder="e.g. Cynthia Vance"
                className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Email Address</label>
              <input
                value={newSignerEmail}
                onChange={(e) => setNewSignerEmail(e.target.value)}
                placeholder="cynthia.vance@company.com"
                className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Corporate Title</label>
              <input
                value={newSignerTitle}
                onChange={(e) => setNewSignerTitle(e.target.value)}
                placeholder="e.g. Chief Financial Officer (optional)"
                className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Team Scope Mapping</label>
              <select
                value={newSignerTeamId}
                onChange={(e) => setNewSignerTeamId(e.target.value)}
                className="w-full border border-border/60 bg-background px-3 py-2 text-xs font-mono uppercase tracking-wider outline-none focus:border-foreground"
              >
                <option value="">Global Workspace</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="border-border mt-4">
            <Button variant="outline" onClick={() => setNewSignerOpen(false)} className="font-mono text-xs uppercase tracking-wide">
              Cancel
            </Button>
            <Button
              disabled={isBusy || !newSignerName.trim() || !newSignerEmail.trim()}
              loading={busyAction === "create-signer"}
              loadingText="Adding..."
              onClick={createSigner}
              className="font-mono text-xs uppercase tracking-wide bg-foreground text-background hover:bg-foreground/90 font-bold"
            >
              Add Signer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newGroupOpen} onOpenChange={(open) => {
        setNewGroupOpen(open)
        if (!open) {
          setNewGroupName("")
          setNewGroupDescription("")
          setNewGroupTeamId("")
          setSelectedGroupMembers([])
          setGroupCreationStep("details")
        }
      }}>
        <DialogContent className="border-border bg-popover shadow-sm max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest text-foreground flex items-center gap-2">
              <FolderIcon className="size-4 text-orange-500" />
              {groupCreationStep === "details" ? "Assemble Group" : "Select Group Members"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {groupCreationStep === "details"
                ? "Provide metadata for the corporate signer group. Groups help map multi-party workflows easily."
                : "Choose registered signers or workspace members to include in the group pool."}
            </DialogDescription>
          </DialogHeader>

          {groupCreationStep === "details" ? (
            <div className="space-y-4 py-3">
              <div className="space-y-1">
                <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Group Name</label>
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Legal Counsel, CFO Desk"
                  className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Official Description</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Reviewers responsible for corporate NDA sign-off."
                  rows={3}
                  className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors font-mono resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Team Scope</label>
                <select
                  value={newGroupTeamId}
                  onChange={(e) => setNewGroupTeamId(e.target.value)}
                  className="w-full border border-border/60 bg-background px-3 py-2 text-xs font-mono uppercase tracking-wider outline-none focus:border-foreground"
                >
                  <option value="">Global Workspace</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="py-3">
              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1.5 font-mono text-[10px]">
                {members.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="font-bold uppercase tracking-widest text-muted-foreground text-[8px] border-b border-border/30 pb-1">Workspace Members</p>
                    {members.map((member) => (
                      <label key={`m-${member.id}`} className="flex items-center justify-between gap-3 px-3 py-2 border border-border/40 bg-background hover:bg-muted/10 cursor-pointer transition-all">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground truncate">{member.user?.name || "Workspace Member"}</div>
                          <div className="text-muted-foreground text-[9px] truncate">{member.user?.email}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedGroupMembers.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupMembers([...selectedGroupMembers, member.id])
                            } else {
                              setSelectedGroupMembers(selectedGroupMembers.filter((m) => m !== member.id))
                            }
                          }}
                          className="size-3.5 border-border/60 accent-orange-500"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {directorySigners.length > 0 && (
                  <div className="space-y-1.5 mt-4">
                    <p className="font-bold uppercase tracking-widest text-muted-foreground text-[8px] border-b border-border/30 pb-1">Registered Signatories</p>
                    {directorySigners.map((signer) => (
                      <label key={`s-${signer.id}`} className="flex items-center justify-between gap-3 px-3 py-2 border border-border/40 bg-background hover:bg-muted/10 cursor-pointer transition-all">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground truncate">{signer.name}</div>
                          <div className="text-muted-foreground text-[9px] truncate">{signer.email}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedGroupMembers.includes(signer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupMembers([...selectedGroupMembers, signer.id])
                            } else {
                              setSelectedGroupMembers(selectedGroupMembers.filter((m) => m !== signer.id))
                            }
                          }}
                          className="size-3.5 border-border/60 accent-orange-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="border-border mt-4">
            {groupCreationStep === "details" ? (
              <>
                <Button variant="outline" onClick={() => setNewGroupOpen(false)} className="font-mono text-xs uppercase tracking-wide">
                  Cancel
                </Button>
                <Button
                  disabled={!newGroupName.trim()}
                  onClick={() => setGroupCreationStep("members")}
                  className="font-mono text-xs uppercase tracking-wide bg-foreground text-background hover:bg-foreground/90 font-bold"
                >
                  Next: Select Members
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setGroupCreationStep("details")} className="font-mono text-xs uppercase tracking-wide border-border/60">
                  Back
                </Button>
                <Button
                  disabled={isBusy}
                  loading={busyAction === "create-group"}
                  loadingText="Assembling..."
                  onClick={createSignerGroup}
                  className="font-mono text-xs uppercase tracking-wide bg-orange-500 hover:bg-orange-600 text-white border border-orange-500/20 font-bold"
                >
                  Assemble Group
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(groupToDelete)} onOpenChange={(open) => {
        if (!open) setGroupToDelete(null)
      }}>
        <DialogContent className="border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest text-destructive flex items-center gap-2">
              <Trash2Icon className="size-4" />
              Delete Signer Group
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">{groupToDelete?.name}</strong>? Workspace members inside the group will not be deleted from the directory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-border mt-4">
            <Button variant="outline" onClick={() => setGroupToDelete(null)} className="font-mono text-xs uppercase border-border/60">
              Cancel
            </Button>
            <Button
              disabled={isBusy}
              loading={busyAction === "delete-group"}
              loadingText="Deleting..."
              onClick={() => void deleteSignerGroup()}
              className="font-mono text-xs uppercase bg-destructive hover:bg-destructive/90 text-white border border-destructive/20"
            >
              {isBusy ? "Deleting..." : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(directorySignerToDelete)} onOpenChange={(open) => {
        if (!open) setDirectorySignerToDelete(null)
      }}>
        <DialogContent className="border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest text-destructive flex items-center gap-2">
              <Trash2Icon className="size-4" />
              Delete Signer
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Remove <strong className="text-foreground">{directorySignerToDelete?.name}</strong> from the workspace directory and any associated groups.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-border mt-4">
            <Button variant="outline" onClick={() => setDirectorySignerToDelete(null)} className="font-mono text-xs uppercase border-border/60">
              Cancel
            </Button>
            <Button
              disabled={isBusy}
              loading={busyAction === "delete-directory-signer"}
              loadingText="Deleting..."
              onClick={() => void deleteDirectorySigner()}
              className="font-mono text-xs uppercase bg-destructive hover:bg-destructive/90 text-white border border-destructive/20"
            >
              {isBusy ? "Deleting..." : "Delete Signer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(signerToDelete)} onOpenChange={(open) => {
        if (!open) setSignerToDelete(null)
      }}>
        <DialogContent className="border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest text-destructive flex items-center gap-2">
              <Trash2Icon className="size-4" />
              Delete Session Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
              This will permanently delete the active session record for <strong className="text-foreground">{signerToDelete?.signerName}</strong> under document <strong className="text-foreground">{signerToDelete?.documentName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-border mt-4">
            <Button variant="outline" onClick={() => setSignerToDelete(null)} className="font-mono text-xs uppercase border-border/60">
              Cancel
            </Button>
            <Button
              disabled={isBusy}
              loading={busyAction === "delete-activity"}
              loadingText="Deleting..."
              onClick={deleteSignerActivity}
              className="font-mono text-xs uppercase bg-destructive hover:bg-destructive/90 text-white border border-destructive/20"
            >
              {isBusy ? "Deleting..." : "Delete Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 font-mono text-xs font-bold uppercase tracking-wider relative transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {active && (
        <motion.div
          layoutId="signerTabUnderline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
          transition={{ duration: 0.22 }}
        />
      )}
    </button>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon: typeof UsersIcon
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border bg-card p-12 text-center max-w-xl mx-auto mt-6">
      <div className="flex size-14 items-center justify-center bg-orange-500/5 text-orange-500 border border-orange-500/10 mb-5">
        <Icon className="size-6" />
      </div>
      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
      <p className="mt-2 text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</p>
      <Button
        onClick={onAction}
        className="mt-6 h-8 px-4 font-mono text-[10px] uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 font-bold"
      >
        {actionLabel}
      </Button>
    </div>
  )
}
