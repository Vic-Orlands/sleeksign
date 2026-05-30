"use client"
import { 
  CircleAlertIcon, 
  LayoutGrid, 
  Users, 
  Palette, 
  ShieldAlert, 
  Folder, 
  UserCheck, 
  Clock, 
  Eye, 
  Globe, 
  Copy, 
  Lock, 
  Calendar,
  Trash2
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"

import { HrShell } from "@/components/hr/hr-shell"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { authClient } from "@/lib/auth-client"
import { useCurrentWorkspaceId } from "@/lib/workspace-store"

type TeamPayload = {
  id: string
  name: string
  description?: string | null
  isDefault?: boolean
  memberIds?: string[]
}

type RolePayload = {
  id: string
  name: string
  permissions: string[]
}

type MemberPayload = {
  id: string
  role: string
  user?: {
    name: string
    email: string
  } | null
  teamIds: string[]
  roleAssignments: Array<{
    id: string
    roleId: string
    teamId?: string | null
    role?: {
      name: string
    } | null
  }>
}

type InvitationPayload = {
  id: string
  email: string
  role: string
  status: string
}

type BrandingPayload = {
  senderName: string
  primaryColor: string
  secondaryColor: string
  neutralColor: string
  accentColor: string
  supportEmail?: string | null
  logoUrl?: string | null
  domain?: string | null
}

type SignerPayload = {
  id: string
  name: string
  email: string
  title?: string | null
  teamId?: string | null
  teamName?: string | null
  status: "active" | "archived"
}

type SignerGroupPayload = {
  id: string
  name: string
  description?: string | null
  teamId?: string | null
  teamName?: string | null
  signers: Array<{
    id: string
    name: string
    email: string
    title?: string | null
    teamId?: string | null
  }>
}

type SettingsSection = "general" | "workspace" | "branding" | "audit"

export default function EnterpriseAdminPage() {
  const workspaceId = useCurrentWorkspaceId()
  const { data: session } = authClient.useSession()
  const { data: authOrganizations } = authClient.useListOrganizations()

  const [workspaceDeleteOpen, setWorkspaceDeleteOpen] = useState(false)
  const [workspaceConfirmInput, setWorkspaceConfirmInput] = useState("")
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false)
  const [accountConfirmInput, setAccountConfirmInput] = useState("")
  const [memberToRemove, setMemberToRemove] = useState<MemberPayload | null>(null)
  const [teamToDelete, setTeamToDelete] = useState<TeamPayload | null>(null)

  const [query, setQuery] = useState("")
  const [teams, setTeams] = useState<TeamPayload[]>([])
  const [roles, setRoles] = useState<RolePayload[]>([])
  const [members, setMembers] = useState<MemberPayload[]>([])
  const [activeRole, setActiveRole] = useState("member")
  const [invitations, setInvitations] = useState<InvitationPayload[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [signers, setSigners] = useState<SignerPayload[]>([])
  const [signerGroups, setSignerGroups] = useState<SignerGroupPayload[]>([])
  const [branding, setBranding] = useState<BrandingPayload>({
    senderName: "SleekSign",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    neutralColor: "#f7f5f1",
    accentColor: "#ea580c",
    supportEmail: "",
    logoUrl: "",
    domain: "",
  })
  const [domainInput, setDomainInput] = useState("")
  const [domainToken, setDomainToken] = useState("")
  const [domainId, setDomainId] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [newSignerName, setNewSignerName] = useState("")
  const [newSignerEmail, setNewSignerEmail] = useState("")
  const [newSignerTitle, setNewSignerTitle] = useState("")
  const [newSignerTeamId, setNewSignerTeamId] = useState("")
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [newGroupTeamId, setNewGroupTeamId] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [selectedRoleByMember, setSelectedRoleByMember] = useState<Record<string, string>>({})
  const [selectedMembersByTeam, setSelectedMembersByTeam] = useState<Record<string, string[]>>({})
  const [selectedSignersByGroup, setSelectedSignersByGroup] = useState<Record<string, string[]>>({})
  const [activeSection, setActiveSection] = useState<SettingsSection>("general")
  const [permissionsSheetOpen, setPermissionsSheetOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberPayload | null>(null)
  const [directoryTab, setDirectoryTab] = useState<"members" | "teams" | "signers" | "groups">("members")

  async function handleDeleteWorkspace() {
    if (!workspaceId) return
    setIsBusy(true)
    try {
      const activeOrg = authOrganizations?.find((org) => org.id === workspaceId)
      if (workspaceConfirmInput.trim() !== activeOrg?.name) {
        toast.error("Incorrect workspace name")
        return
      }
      await authClient.organization.delete({
        organizationId: workspaceId,
      })
      toast.success("Workspace deleted successfully")
      setWorkspaceDeleteOpen(false)
      setWorkspaceConfirmInput("")
      
      const nextOrg = authOrganizations?.find((org) => org.id !== workspaceId)
      if (nextOrg) {
        await authClient.$fetch("/organization/set-active", {
          method: "POST",
          body: { organizationId: nextOrg.id },
        })
        window.location.href = "/hr/documents"
      } else {
        window.location.href = "/signup"
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete workspace")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleDeleteAccount() {
    setIsBusy(true)
    try {
      if (accountConfirmInput.trim() !== "DELETE MY ACCOUNT") {
        toast.error("Incorrect confirmation phrase")
        return
      }
      await authClient.deleteUser()
      await authClient.signOut()
      toast.success("Account deleted successfully")
      setAccountDeleteOpen(false)
      setAccountConfirmInput("")
      window.location.href = "/signin"
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete account")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRemoveMember() {
    if (!workspaceId || !memberToRemove) return
    setIsBusy(true)
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: memberToRemove.id,
        organizationId: workspaceId,
      })
      toast.success("Member removed from workspace")
      setMemberToRemove(null)
      await refreshEnterpriseData(workspaceId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleDeleteTeam() {
    if (!workspaceId || !teamToDelete) return
    setIsBusy(true)
    try {
      const res = await fetch(`/api/teams/${teamToDelete.id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to delete team")
      toast.success("Team deleted successfully")
      setTeamToDelete(null)
      await refreshEnterpriseData(workspaceId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete team")
    } finally {
      setIsBusy(false)
    }
  }


  async function loadEnterpriseData(targetWorkspaceId: string) {
    const [teamsRes, brandingRes, signersRes, signerGroupsRes, roleRes, invitationsRes] = await Promise.all([
      fetch(`/api/teams?workspaceId=${encodeURIComponent(targetWorkspaceId)}`),
      fetch(`/api/branding?workspaceId=${encodeURIComponent(targetWorkspaceId)}`),
      fetch(`/api/signers/directory?workspaceId=${encodeURIComponent(targetWorkspaceId)}`),
      fetch(`/api/signer-groups?workspaceId=${encodeURIComponent(targetWorkspaceId)}`),
      authClient.$fetch("/organization/get-active-member-role"),
      authClient.$fetch(`/organization/list-invitations?organizationId=${encodeURIComponent(targetWorkspaceId)}`),
    ])
    const teamsData = (await teamsRes.json()) as {
      teams?: TeamPayload[]
      roles?: RolePayload[]
      members?: MemberPayload[]
    }
    const brandingData = (await brandingRes.json()) as {
      branding?: BrandingPayload | null
    }
    const signersData = (await signersRes.json()) as {
      signers?: SignerPayload[]
    }
    const signerGroupsData = (await signerGroupsRes.json()) as {
      groups?: SignerGroupPayload[]
    }
    const roleData = roleRes as unknown as { role?: string }
    const invitationData = invitationsRes as unknown as InvitationPayload[]

    return {
      teams: Array.isArray(teamsData.teams) ? teamsData.teams : [],
      roles: Array.isArray(teamsData.roles) ? teamsData.roles : [],
      members: Array.isArray(teamsData.members) ? teamsData.members : [],
      activeRole: typeof roleData.role === "string" ? roleData.role : "member",
      invitations: Array.isArray(invitationData)
        ? invitationData.filter((invitation) => invitation.status === "pending")
        : [],
      signers: Array.isArray(signersData.signers) ? signersData.signers : [],
      signerGroups: Array.isArray(signerGroupsData.groups) ? signerGroupsData.groups : [],
      branding: brandingData.branding || null,
    }
  }

  useEffect(() => {
    if (!workspaceId) return

    let cancelled = false

    ;(async () => {
      const data = await loadEnterpriseData(workspaceId)
      if (cancelled) return
      setTeams(data.teams)
      setRoles(data.roles)
      setMembers(data.members)
      setActiveRole(data.activeRole)
      setInvitations(data.invitations)
      setSigners(data.signers)
      setSignerGroups(data.signerGroups)
      setSelectedMembersByTeam(
        Object.fromEntries(
          data.teams.map((team: TeamPayload) => [team.id, Array.isArray(team.memberIds) ? team.memberIds : []]),
        ),
      )
      setSelectedSignersByGroup(
        Object.fromEntries(
          data.signerGroups.map((group: SignerGroupPayload) => [
            group.id,
            group.signers.map((signer) => signer.id),
          ]),
        ),
      )
      if (data.branding) {
        setBranding(data.branding)
      }
    })().catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [workspaceId])

  async function refreshEnterpriseData(targetWorkspaceId: string) {
    const refreshedData = await loadEnterpriseData(targetWorkspaceId)
    setTeams(refreshedData.teams)
    setRoles(refreshedData.roles)
    setMembers(refreshedData.members)
    setActiveRole(refreshedData.activeRole)
    setInvitations(refreshedData.invitations)
    setSigners(refreshedData.signers)
    setSignerGroups(refreshedData.signerGroups)
    setSelectedMembersByTeam(
      Object.fromEntries(
        refreshedData.teams.map((team: TeamPayload) => [
          team.id,
          Array.isArray(team.memberIds) ? team.memberIds : [],
        ]),
      ),
    )
    setSelectedSignersByGroup(
      Object.fromEntries(
        refreshedData.signerGroups.map((group: SignerGroupPayload) => [
          group.id,
          group.signers.map((signer) => signer.id),
        ]),
      ),
    )
    if (refreshedData.branding) {
      setBranding(refreshedData.branding)
    }
  }

  const filteredMembers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return members

    return members.filter((member) =>
      [member.user?.name, member.user?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    )
  }, [members, query])

  const filteredSigners = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return signers

    return signers.filter((signer) =>
      [signer.name, signer.email, signer.teamName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    )
  }, [query, signers])

  async function createTeam() {
    if (!workspaceId || !newTeamName.trim()) return
    setIsBusy(true)
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          name: newTeamName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to create team")
      setNewTeamName("")
      toast.success("Team created")
      await refreshEnterpriseData(workspaceId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create team")
    } finally {
      setIsBusy(false)
    }
  }

  async function inviteMember() {
    if (!workspaceId || !inviteEmail.trim()) return
    setIsBusy(true)
    try {
      await authClient.$fetch("/organization/invite-member", {
        method: "POST",
        body: {
          email: inviteEmail.trim(),
          role: inviteRole,
          organizationId: workspaceId,
        },
      })
      setInviteEmail("")
      setInviteRole("member")
      toast.success("Invitation sent")
      await refreshEnterpriseData(workspaceId)
    } catch {
      toast.error("Unable to invite this member")
    } finally {
      setIsBusy(false)
    }
  }

  async function cancelInvitation(invitationId: string) {
    if (!workspaceId) return
    setIsBusy(true)
    try {
      await authClient.$fetch("/organization/cancel-invitation", {
        method: "POST",
        body: { invitationId },
      })
      toast.success("Invitation cancelled")
      await refreshEnterpriseData(workspaceId)
    } catch {
      toast.error("Unable to cancel invitation")
    } finally {
      setIsBusy(false)
    }
  }

  async function createSigner() {
    if (!workspaceId || !newSignerName.trim() || !newSignerEmail.trim()) return
    setIsBusy(true)
    try {
      const res = await fetch("/api/signers/directory", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          name: newSignerName.trim(),
          email: newSignerEmail.trim(),
          title: newSignerTitle.trim(),
          teamId: newSignerTeamId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to create signer")
      setNewSignerName("")
      setNewSignerEmail("")
      setNewSignerTitle("")
      setNewSignerTeamId("")
      toast.success("Signer created")
      await refreshEnterpriseData(workspaceId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create signer")
    } finally {
      setIsBusy(false)
    }
  }

  async function createSignerGroup() {
    if (!workspaceId || !newGroupName.trim()) return
    setIsBusy(true)
    try {
      const res = await fetch("/api/signer-groups", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          teamId: newGroupTeamId || null,
          signerIds: selectedSignersByGroup.__draft__ || [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to create signer group")
      setNewGroupName("")
      setNewGroupDescription("")
      setNewGroupTeamId("")
      setSelectedSignersByGroup((current) => ({ ...current, __draft__: [] }))
      toast.success("Signer group created")
      await refreshEnterpriseData(workspaceId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create signer group")
    } finally {
      setIsBusy(false)
    }
  }

  async function saveBranding() {
    if (!workspaceId) return
    setIsBusy(true)
    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        body: JSON.stringify({
          workspaceId,
          senderName: branding.senderName,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          neutralColor: branding.neutralColor,
          accentColor: branding.accentColor,
          supportEmail: branding.supportEmail,
          logoUrl: branding.logoUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to save branding")
      toast.success("Branding saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save branding")
    } finally {
      setIsBusy(false)
    }
  }

  async function requestDomain() {
    if (!workspaceId || !domainInput.trim()) return
    setIsBusy(true)
    try {
      const res = await fetch("/api/branding/domains", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          hostname: domainInput.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to request domain")
      setDomainId(data.id || "")
      setDomainToken(data.verificationToken || "")
      toast.success("Domain challenge created")
      await refreshEnterpriseData(workspaceId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to request domain")
    } finally {
      setIsBusy(false)
    }
  }

  async function verifyDomain() {
    if (!workspaceId || !domainId || !domainToken) return
    setIsBusy(true)
    try {
      const res = await fetch("/api/branding/domains/verify", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          domainId,
          verificationToken: domainToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to verify domain")
      toast.success("Domain verified")
      await refreshEnterpriseData(workspaceId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to verify domain")
    } finally {
      setIsBusy(false)
    }
  }

  async function assignRole(memberId: string) {
    if (!workspaceId || !selectedRoleByMember[memberId]) return
    setIsBusy(true)
    try {
      const res = await fetch("/api/permissions/assignments", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          memberId,
          roleId: selectedRoleByMember[memberId],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to assign role")
      toast.success("Permission role assigned")
      await refreshEnterpriseData(workspaceId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign role")
    } finally {
      setIsBusy(false)
    }
  }

  async function saveTeamMembers(teamId: string) {
    if (!workspaceId) return
    setIsBusy(true)
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        body: JSON.stringify({
          workspaceId,
          memberIds: selectedMembersByTeam[teamId] || [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to update team members")
      toast.success("Team membership updated")
      await refreshEnterpriseData(workspaceId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update team members")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <HrShell
      query={query}
      onQueryChange={setQuery}
      onUpload={() => {}}
      activeView="admin"
      headerMode="minimal"
      pendingCount={0}
      inProgressCount={0}
      completedCount={0}
    >
      <section className="min-h-0 overflow-auto bg-[var(--paper)] px-4 py-6 sm:px-6 md:py-8">
        <div className="mx-auto max-w-[92rem] space-y-6">
          
          {/* Header Title Banner */}
          <div className="border-b border-border/60 bg-background p-6 md:p-8 relative overflow-hidden shadow-xs">
            <div className="absolute right-0 top-0 w-48 h-48 opacity-[0.03] sleek-grid pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-orange-500 font-bold">
                  SleekSign Core Panel
                </p>
                <h1 className="text-2xl font-light tracking-tight text-foreground sm:text-3xl font-sans uppercase">
                  {activeSection === "workspace"
                    ? "Workspace Administration"
                    : activeSection === "branding"
                      ? "Identity & Brand Assets"
                      : activeSection === "audit"
                        ? "Enterprise Security Audit"
                        : "General Settings"}
                </h1>
                <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                  {activeSection === "workspace"
                    ? "Orchestrate members, design structured corporate teams, manage signing credentials, and configure visual access permissions across your organizational directory."
                    : activeSection === "branding"
                      ? "Maintain a consistent customer experience. Personalize your visual colors, company logos, support channels, and authenticate custom DNS verified signing domains."
                      : activeSection === "audit"
                        ? "Verify security configurations, active operational events, and system triggers compiled from your workspace document logs."
                        : "Monitor workspace statistics, analyze active directory configurations, and review global operational parameters."}
                </p>
              </div>
              <div className="flex items-center gap-2 border border-border/60 px-3 py-1.5 bg-muted/20 font-mono text-[9px] uppercase tracking-widest text-muted-foreground self-start md:self-center">
                <span className="size-1.5 bg-emerald-500 animate-pulse" />
                Active Privilege: <span className="text-foreground font-bold">{activeRole}</span>
              </div>
            </div>
          </div>

          {/* Grid Layout (Sidebar & Main content) */}
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            
            {/* Sidebar Navigation */}
            <aside className="space-y-4">
              <div className="bg-background p-4 space-y-4 shadow-sm border border-border/40">
                <p className="px-2 font-mono text-[8px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
                  Administration
                </p>
                <nav className="flex flex-col gap-1">
                  {[
                    { id: "general", label: "Overview", icon: LayoutGrid },
                    { id: "workspace", label: "Directory", icon: Users },
                    { id: "branding", label: "Branding", icon: Palette },
                    { id: "audit", label: "Security", icon: ShieldAlert },
                  ].map((section) => {
                    const Icon = section.icon
                    const isActive = activeSection === section.id
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id as SettingsSection)}
                        className={`flex items-center gap-3 px-3 py-3 text-left text-[11px] font-mono uppercase tracking-widest transition-all duration-150 relative ${
                          isActive
                            ? "bg-foreground text-background font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <Icon className="size-4" />
                        <span>{section.label}</span>
                        {isActive && (
                          <span className="absolute right-3 size-1 bg-orange-500" />
                        )}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Helper context panel */}
              <div className="p-4 text-[11px] leading-relaxed text-muted-foreground border-l-2 border-border/80 bg-background/50">
                <p className="font-mono text-[8px] uppercase tracking-widest text-foreground font-bold mb-1">Architecture Note</p>
                SleekSign groups controls under sharp, modular tabs to eliminate visual modal sprawl and streamline directory configuration.
              </div>
            </aside>

            {/* Main Content Area with View Transitions */}
            <main className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-6"
                >
                  
                  {/* General Overview Section */}
                  {activeSection === "general" && (
                    <div className="space-y-6">
                      
                      {/* Metric Dashboard */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: "Active Teams", count: teams.length, icon: Folder, detail: "Department groups" },
                          { label: "Workspace Members", count: members.length, icon: Users, detail: "Authorized users" },
                          { label: "Registered Signers", count: signers.length, icon: UserCheck, detail: "Signing directory" },
                          { label: "Pending Invites", count: invitations.length, icon: Clock, detail: "Awaiting registration" },
                        ].map((metric, i) => {
                          const Icon = metric.icon
                          return (
                            <div key={i} className="bg-background p-5 relative group shadow-xs hover:shadow-sm transition-all border border-border/40">
                              <div className="absolute top-0 right-0 w-8 h-8 opacity-[0.02] group-hover:opacity-[0.06] bg-foreground sleek-grid pointer-events-none" />
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground font-bold">{metric.label}</span>
                                <Icon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                              <p className="mt-3 text-3xl font-light tracking-tight tabular-nums text-foreground">{metric.count}</p>
                              <p className="mt-1.5 text-[10px] text-muted-foreground font-mono">{metric.detail}</p>
                            </div>
                          )
                        })}
                      </div>

                      {/* Snapshots detailed info panels */}
                      <div className="grid md:grid-cols-2 gap-6">
                        
                        {/* Config snapshot */}
                        <div className="bg-background p-6 space-y-4 shadow-xs border border-border/40">
                          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                            <Lock className="size-4 text-orange-500" />
                            <h3 className="font-mono text-xs uppercase tracking-widest font-bold">Workspace Configuration</h3>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Your global signing privileges are scoped strictly by role permissions. Controls are grouped under **Directory** for team operations, **Branding** for white-label settings, and **Security** for operational logging.
                          </p>
                          <div className="bg-muted/30 p-3 text-[11px] font-mono text-muted-foreground leading-normal border-l border-border">
                            System Access State: <span className="text-foreground font-bold">READY</span><br />
                            Integration Level: <span className="text-foreground font-bold">ENTERPRISE_ACTIVE</span>
                          </div>
                        </div>

                        {/* Recent changes helper */}
                        <div className="bg-background p-6 space-y-4 shadow-xs border border-border/40">
                          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                            <Calendar className="size-4 text-orange-500" />
                            <h3 className="font-mono text-xs uppercase tracking-widest font-bold">Directory Highlights</h3>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Need to onboard team members or update corporate signer details? Simply navigate to the **Directory** tab to manage custom domains, signer credentials, and organizational permissions.
                          </p>
                          <div className="flex items-center gap-2 text-xs text-orange-500 font-mono">
                            <span className="size-1.5 bg-orange-500 animate-pulse" />
                            No pending security updates required.
                          </div>
                        </div>

                      </div>

                      {/* Danger Zone */}
                      <div className="border border-destructive/20 bg-destructive/[0.01] p-6 space-y-4 shadow-xs">
                        <div className="flex items-center gap-2 border-b border-destructive/20 pb-3">
                          <ShieldAlert className="size-4 text-destructive" />
                          <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-destructive">Danger Zone</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Delete Workspace */}
                          <div className="space-y-3">
                            <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-foreground">Delete Workspace</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Permanently erase this workspace, including all associated teams, signer records, groups, and brand configurations. This action is irreversible.
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => setWorkspaceDeleteOpen(true)}
                              className="font-mono text-[10px] uppercase border-destructive/30 hover:border-destructive text-destructive hover:bg-destructive/5 px-4 h-9"
                            >
                              Delete Workspace
                            </Button>
                          </div>
                          
                          {/* Delete Account */}
                          <div className="space-y-3">
                            <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-foreground">Delete Account</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Permanently close and delete your personal user account and remove your active user credentials from all directory scopes.
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => setAccountDeleteOpen(true)}
                              className="font-mono text-[10px] uppercase border-destructive/30 hover:border-destructive text-destructive hover:bg-destructive/5 px-4 h-9"
                            >
                              Delete Account
                            </Button>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Workspace / Directory Section */}
                  {activeSection === "workspace" && (
                    <div className="space-y-6 bg-background p-6 shadow-sm border border-border/40">
                      
                      {/* Nested Horizontal Directory Tabs */}
                      <div className="flex border-b border-border/40 pb-px mb-6 gap-2 sm:gap-4 overflow-x-auto">
                        {([
                          { id: "members", label: "Members", icon: Users },
                          { id: "teams", label: "Teams", icon: Folder },
                          { id: "signers", label: "Signers", icon: UserCheck },
                          { id: "groups", label: "Groups", icon: Folder },
                        ] as const).map((tab) => {
                          const Icon = tab.icon
                          const isActive = directoryTab === tab.id
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setDirectoryTab(tab.id)}
                              className={`flex items-center gap-2 px-4 py-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest relative transition-all duration-150 -mb-px border-b-2 ${
                                isActive
                                  ? "text-foreground font-bold border-orange-500 rounded-none!"
                                  : "text-muted-foreground hover:text-foreground border-transparent"
                              }`}
                            >
                              <Icon className="size-3.5" />
                              <span>{tab.label}</span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Directory Subviews */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={directoryTab}
                          initial={{ opacity: 0, x: 2 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -2 }}
                          transition={{ duration: 0.12 }}
                          className="min-h-[400px]"
                        >
                          
                          {/* Subview 1: Members Directory */}
                          {directoryTab === "members" && (
                            <div className="grid lg:grid-cols-[1fr_minmax(0,1.2fr)] gap-6">
                              
                              {/* Invite Panel */}
                              <div className="space-y-4">
                                <div className="border-b border-border/40 pb-3">
                                  <div className="flex items-center gap-2">
                                    <Users className="size-4 text-orange-500" />
                                    <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Invite Member</h2>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                      value={inviteEmail}
                                      onChange={(event) => setInviteEmail(event.target.value)}
                                      placeholder="colleague@company.com"
                                      className="flex-1 border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors"
                                    />
                                    <select
                                      value={inviteRole}
                                      onChange={(event) => setInviteRole(event.target.value)}
                                      className="border border-border/60 bg-background px-3 py-2 text-xs font-mono uppercase tracking-widest focus:border-foreground outline-none transition-colors"
                                    >
                                      {["member", "admin", "owner"].map((role) => (
                                        <option key={role} value={role}>
                                          {role.toUpperCase()}
                                        </option>
                                      ))}
                                    </select>
                                    <Button
                                      disabled={isBusy}
                                      onClick={() => void inviteMember()}
                                      className="font-mono text-xs uppercase px-4 h-9"
                                    >
                                      Invite
                                    </Button>
                                  </div>

                                  {/* Pending Invitations list */}
                                  {invitations.length > 0 && (
                                    <div className="pt-2 space-y-2">
                                      <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Pending Invitations</p>
                                      {invitations.map((invitation) => (
                                        <div key={invitation.id} className="flex items-center justify-between gap-3 bg-muted/20 px-3 py-2 border-l border-border">
                                          <div className="min-w-0">
                                            <p className="truncate text-xs font-medium">{invitation.email}</p>
                                            <p className="font-mono text-[9px] text-muted-foreground uppercase mt-0.5">
                                              Role: {invitation.role} · Pending Check
                                            </p>
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isBusy}
                                            onClick={() => void cancelInvitation(invitation.id)}
                                            className="h-7 text-[10px] font-mono uppercase px-2 border-border text-destructive hover:border-destructive hover:bg-destructive/5"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Member Directory Grid */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                                  <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Active Members</h2>
                                  <span className="text-[10px] text-muted-foreground font-mono">{filteredMembers.length} users</span>
                                </div>

                                <div className="space-y-3 max-h-125 overflow-y-auto pr-1">
                                  {filteredMembers.map((member) => {
                                    const initials = ((member.user?.name || member.user?.email || "U").substring(0, 2)).toUpperCase()
                                    const isSelf = member.user?.email === session?.user?.email
                                    return (
                                      <div key={member.id} className="p-4 space-y-3 bg-muted/5 hover:bg-muted/10 transition-colors border border-border/30">
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex items-center gap-3">
                                            <div className="size-9 bg-primary/5 border border-border/60 flex items-center justify-center font-mono text-[11px] font-bold text-foreground">
                                              {initials}
                                            </div>
                                            <div>
                                              <h4 className="text-xs font-medium text-foreground">{member.user?.name || "Workspace User"}</h4>
                                              <p className="text-[10px] text-muted-foreground">{member.user?.email}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="text-right">
                                              <span className="inline-block px-1.5 py-0.5 bg-muted font-mono text-[8px] uppercase tracking-widest text-foreground font-bold border border-border/40">
                                                {member.role}
                                              </span>
                                              <p className="text-[9px] text-muted-foreground mt-0.5">{member.teamIds.length} teams</p>
                                            </div>
                                            <button
                                              type="button"
                                              className="p-1.5 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                              onClick={() => {
                                                setSelectedMember(member)
                                                setPermissionsSheetOpen(true)
                                              }}
                                              title="View Permissions"
                                            >
                                              <CircleAlertIcon className="size-3.5" />
                                            </button>
                                            {!isSelf && (
                                              <button
                                                type="button"
                                                className="p-1.5 border border-border/60 hover:bg-destructive/10 text-destructive transition-colors"
                                                onClick={() => setMemberToRemove(member)}
                                                title="Remove Member"
                                              >
                                                <Trash2 className="size-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Role Assign Action */}
                                        <div className="flex gap-2 pt-2 border-t border-dashed border-border/40">
                                          <select
                                            value={selectedRoleByMember[member.id] || ""}
                                            onChange={(event) =>
                                              setSelectedRoleByMember((current) => ({
                                                ...current,
                                                [member.id]: event.target.value,
                                              }))
                                            }
                                            className="flex-1 border border-border/60 bg-background px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider outline-none focus:border-foreground"
                                          >
                                            <option value="">Assign privileges...</option>
                                            {roles
                                              .filter((role) => role.name !== "Team Manager")
                                              .map((role) => (
                                                <option key={role.id} value={role.id}>
                                                  {role.name.toUpperCase()}
                                                </option>
                                              ))}
                                          </select>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isBusy || !selectedRoleByMember[member.id]}
                                            onClick={() => void assignRole(member.id)}
                                            className="h-8 px-2 font-mono text-[10px] uppercase border-border/60 hover:border-foreground"
                                          >
                                            Assign
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                            </div>
                          )}

                          {/* Subview 2: Workspace Teams */}
                          {directoryTab === "teams" && (
                            <div className="space-y-6">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-3">
                                <div className="flex items-center gap-2">
                                  <Folder className="size-4 text-orange-500" />
                                  <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Workspace Teams</h2>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    value={newTeamName}
                                    onChange={(event) => setNewTeamName(event.target.value)}
                                    placeholder="Team name"
                                    className="w-44 border border-border/60 bg-background px-3 py-1.5 text-xs outline-none focus:border-foreground transition-colors"
                                  />
                                  <Button
                                    disabled={isBusy}
                                    onClick={() => void createTeam()}
                                    size="sm"
                                    className="font-mono text-[10px] uppercase px-4 h-8"
                                  >
                                    Create Team
                                  </Button>
                                </div>
                              </div>

                              {/* Teams List Layout */}
                              <div className="grid md:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto pr-1">
                                {teams.map((team, index) => {
                                  const avatarColors = [
                                    "bg-orange-500/10 text-orange-500 border-orange-500/20",
                                    "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                    "bg-purple-500/10 text-purple-500 border-purple-500/20",
                                    "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  ]
                                  const avatarColor = avatarColors[index % avatarColors.length]
                                  return (
                                    <div key={team.id} className="p-4 space-y-4 bg-muted/5 hover:bg-muted/10 transition-colors border border-border/30">
                                      <div className="flex items-start justify-between gap-4">
                                        <div>
                                          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">{team.name}</h3>
                                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                            {team.description || (team.isDefault ? "Default corporate team" : "Custom organizational group")}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isBusy}
                                            onClick={() => void saveTeamMembers(team.id)}
                                            className="h-7 text-[10px] font-mono uppercase px-3 border-border/60 hover:border-foreground"
                                          >
                                            Save members
                                          </Button>
                                          {!team.isDefault && (
                                            <button
                                              type="button"
                                              className="p-1.5 border border-border/60 hover:bg-destructive/10 text-destructive transition-colors h-7 w-7 flex items-center justify-center"
                                              onClick={() => setTeamToDelete(team)}
                                              title="Delete Team"
                                            >
                                              <Trash2 className="size-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Team members checklist */}
                                      <div className="space-y-1.5 border-t border-dashed border-border/40 pt-3 max-h-48 overflow-y-auto pr-1">
                                        {members.map((member) => {
                                          const checked = (selectedMembersByTeam[team.id] || []).includes(member.id)
                                          const initials = ((member.user?.name || member.user?.email || "U").substring(0, 2)).toUpperCase()
                                          return (
                                            <label
                                              key={`${team.id}-${member.id}`}
                                              className={`flex items-center justify-between gap-3 px-3 py-2 border cursor-pointer transition-colors ${
                                                checked ? "bg-muted/10 border-border/50" : "border-transparent hover:bg-muted/10"
                                              }`}
                                            >
                                              <div className="flex items-center gap-3">
                                                <input
                                                  type="checkbox"
                                                  checked={checked}
                                                  onChange={(event) => {
                                                    setSelectedMembersByTeam((current) => {
                                                      const currentMembers = current[team.id] || []
                                                      const nextMembers = event.target.checked
                                                        ? [...new Set([...currentMembers, member.id])]
                                                        : currentMembers.filter((entry) => entry !== member.id)
                                                      return {
                                                        ...current,
                                                        [team.id]: nextMembers,
                                                      }
                                                    })
                                                  }}
                                                  className="size-3.5 border-border/60 rounded-none focus:ring-foreground accent-foreground"
                                                />
                                                <div className="flex items-center gap-2">
                                                  <div className={`size-5 border font-mono text-[8px] flex items-center justify-center font-bold ${avatarColor}`}>
                                                    {initials}
                                                  </div>
                                                  <span className="text-xs font-medium text-foreground">{member.user?.name || member.user?.email || "Workspace Member"}</span>
                                                </div>
                                              </div>
                                              <span className="text-[9px] text-muted-foreground font-mono uppercase">{member.role}</span>
                                            </label>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Subview 3: Authorized Signers Directory */}
                          {directoryTab === "signers" && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                                <div className="flex items-center gap-2">
                                  <UserCheck className="size-4 text-orange-500" />
                                  <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Signer Directory</h2>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">{filteredSigners.length} signers registered</span>
                              </div>

                              <div className="grid md:grid-cols-[1fr_minmax(0,1.5fr)] gap-6">
                                
                                {/* Form */}
                                <div className="p-4 space-y-3 bg-muted/10 h-fit border border-border/30">
                                  <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Register Signer</p>
                                  <input
                                    value={newSignerName}
                                    onChange={(event) => setNewSignerName(event.target.value)}
                                    placeholder="Full name"
                                    className="w-full border border-border/60 bg-background px-3 py-1.5 text-xs focus:border-foreground outline-none transition-colors"
                                  />
                                  <input
                                    value={newSignerEmail}
                                    onChange={(event) => setNewSignerEmail(event.target.value)}
                                    placeholder="Email address"
                                    className="w-full border border-border/60 bg-background px-3 py-1.5 text-xs focus:border-foreground outline-none transition-colors"
                                  />
                                  <input
                                    value={newSignerTitle}
                                    onChange={(event) => setNewSignerTitle(event.target.value)}
                                    placeholder="Title (e.g., CFO)"
                                    className="w-full border border-border/60 bg-background px-3 py-1.5 text-xs focus:border-foreground outline-none transition-colors"
                                  />
                                  <select
                                    value={newSignerTeamId}
                                    onChange={(event) => setNewSignerTeamId(event.target.value)}
                                    className="w-full border border-border/60 bg-background px-3 py-1.5 text-xs font-mono uppercase tracking-wider outline-none focus:border-foreground"
                                  >
                                    <option value="">Entire Workspace</option>
                                    {teams.map((team) => (
                                      <option key={team.id} value={team.id}>
                                        {team.name.toUpperCase()}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    disabled={isBusy || !newSignerName.trim() || !newSignerEmail.trim()}
                                    onClick={() => void createSigner()}
                                    className="w-full font-mono text-[10px] uppercase h-8 mt-1"
                                  >
                                    Register Credentials
                                  </Button>
                                </div>

                                {/* List directory */}
                                <div className="grid sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                                  {filteredSigners.map((signer) => (
                                    <div key={signer.id} className="p-3 bg-muted/5 hover:border-foreground/20 transition-all border border-border/30">
                                      <h4 className="text-xs font-bold text-foreground">{signer.name}</h4>
                                      <p className="text-[10px] text-muted-foreground truncate">{signer.email}</p>
                                      <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-dashed border-border/40 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                                        <span className="text-foreground font-semibold">{signer.title || "No Title"}</span>
                                        <span>·</span>
                                        <span>{signer.teamName || "Workspace"}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                              </div>
                            </div>
                          )}

                          {/* Subview 4: Signer Groups */}
                          {directoryTab === "groups" && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                                <div className="flex items-center gap-2">
                                  <Folder className="size-4 text-orange-500" />
                                  <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Signer Groups</h2>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">{signerGroups.length} groups active</span>
                              </div>

                              <div className="grid md:grid-cols-[1fr_minmax(0,1.5fr)] gap-6">
                                
                                {/* Form group */}
                                <div className="p-4 space-y-3 bg-muted/10 h-fit border border-border/30">
                                  <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Assemble Group</p>
                                  <input
                                    value={newGroupName}
                                    onChange={(event) => setNewGroupName(event.target.value)}
                                    placeholder="Group name"
                                    className="w-full border border-border/60 bg-background px-3 py-1.5 text-xs focus:border-foreground outline-none transition-colors"
                                  />
                                  <input
                                    value={newGroupDescription}
                                    onChange={(event) => setNewGroupDescription(event.target.value)}
                                    placeholder="Description"
                                    className="w-full border border-border/60 bg-background px-3 py-1.5 text-xs focus:border-foreground outline-none transition-colors"
                                  />
                                  <select
                                    value={newGroupTeamId}
                                    onChange={(event) => setNewGroupTeamId(event.target.value)}
                                    className="w-full border border-border/60 bg-background px-3 py-1.5 text-xs font-mono uppercase tracking-wider outline-none focus:border-foreground"
                                  >
                                    <option value="">Entire Workspace</option>
                                    {teams.map((team) => (
                                      <option key={team.id} value={team.id}>
                                        {team.name.toUpperCase()}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Signers directory check scroll */}
                                  <div className="space-y-1 max-h-32 overflow-y-auto bg-background p-2 border border-border/60 pr-1">
                                    <p className="font-mono text-[7px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Check Group Signers</p>
                                    {signers.map((signer) => {
                                      const selected = (selectedSignersByGroup.__draft__ || []).includes(signer.id)
                                      return (
                                        <label key={signer.id} className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider cursor-pointer py-1 px-1 hover:bg-muted/40">
                                          <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={(event) =>
                                              setSelectedSignersByGroup((current) => {
                                                const currentItems = current.__draft__ || []
                                                const nextItems = event.target.checked
                                                  ? [...new Set([...currentItems, signer.id])]
                                                  : currentItems.filter((item) => item !== signer.id)
                                                return { ...current, __draft__: nextItems }
                                              })
                                            }
                                            className="size-3.5 border-border/60 rounded-none focus:ring-foreground accent-foreground"
                                          />
                                          <span className="truncate">{signer.name}</span>
                                        </label>
                                      )
                                    })}
                                  </div>

                                  <Button
                                    disabled={isBusy || !newGroupName.trim()}
                                    onClick={() => void createSignerGroup()}
                                    className="w-full font-mono text-[10px] uppercase h-8 mt-1"
                                  >
                                    Create Group
                                  </Button>
                                </div>

                                {/* List groups */}
                                <div className="grid sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                                  {signerGroups.map((group) => (
                                    <div key={group.id} className="p-3 bg-muted/5 hover:border-foreground/20 transition-all border border-border/30">
                                      <h4 className="text-xs font-bold text-foreground">{group.name}</h4>
                                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                                        {group.description || "No corporate description"}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-dashed border-border/40 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                                        <span className="text-foreground font-bold">{group.signers.length} signers</span>
                                        <span>·</span>
                                        <span>{group.teamName || "Workspace"}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                              </div>
                            </div>
                          )}

                        </motion.div>
                      </AnimatePresence>

                    </div>
                  )}

                  {/* Branding Section */}
                  {activeSection === "branding" && (
                    <div className="space-y-6">
                      
                      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
                        
                        {/* Branding input parameters */}
                        <div className="bg-background p-5 space-y-4 h-fit border border-border/40 shadow-xs">
                          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                            <Palette className="size-4 text-orange-500" />
                            <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Identity & Palette Settings</h2>
                          </div>

                          <div className="grid gap-4">
                            <div className="space-y-1">
                              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Sender Name</label>
                              <input
                                value={branding.senderName}
                                onChange={(event) =>
                                  setBranding((current) => ({ ...current, senderName: event.target.value }))
                                }
                                placeholder="SleekSign"
                                className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Logo URL</label>
                              <input
                                value={branding.logoUrl || ""}
                                onChange={(event) =>
                                  setBranding((current) => ({ ...current, logoUrl: event.target.value }))
                                }
                                placeholder="https://example.com/logo.png"
                                className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Support Contact Email</label>
                              <input
                                value={branding.supportEmail || ""}
                                onChange={(event) =>
                                  setBranding((current) => ({ ...current, supportEmail: event.target.value }))
                                }
                                placeholder="support@company.com"
                                className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors"
                              />
                            </div>

                            {/* Circular Visual Color Pickers & Hex Codes */}
                            <div className="space-y-2 pt-2">
                              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Brand Color Palette</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                  { key: "primaryColor", label: "Primary Base" },
                                  { key: "secondaryColor", label: "Secondary Hue" },
                                  { key: "neutralColor", label: "Neutral Paper" },
                                  { key: "accentColor", label: "Accent Bright" },
                                ].map((colorObj) => {
                                  const key = colorObj.key as keyof BrandingPayload
                                  return (
                                    <div key={key} className="bg-background p-2.5 flex flex-col gap-2 relative border border-border/40 shadow-xs">
                                      <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground font-bold">{colorObj.label}</span>
                                      <div className="flex items-center gap-2">
                                        <div className="relative size-7 border border-border/60 flex items-center justify-center overflow-hidden">
                                          <input
                                            type="color"
                                            value={branding[key] || "#18181b"}
                                            onChange={(event) =>
                                              setBranding((current) => ({ ...current, [key]: event.target.value }))
                                            }
                                            className="absolute inset-0 size-full border-none cursor-pointer p-0 opacity-100 bg-transparent"
                                          />
                                        </div>
                                        <input
                                          type="text"
                                          maxLength={7}
                                          value={branding[key] || ""}
                                          onChange={(event) =>
                                            setBranding((current) => ({ ...current, [key]: event.target.value }))
                                          }
                                          className="flex-1 w-full border border-border/60 bg-background px-1 py-1 text-[11px] font-mono text-center outline-none focus:border-foreground"
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            <Button
                              disabled={isBusy}
                              onClick={() => void saveBranding()}
                              className="w-full font-mono text-xs uppercase py-2 mt-2 h-9"
                            >
                              Save Brand Assets
                            </Button>
                          </div>
                        </div>

                        {/* Interactive live mockup preview */}
                        <div className="bg-background p-5 h-fit lg:sticky lg:top-6 space-y-4 border border-border/40 shadow-xs">
                          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                            <Eye className="size-4 text-orange-500" />
                            <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Live Mockup View</h2>
                          </div>

                          {/* Email simulated layout */}
                          <div className="border border-border/40 p-4 bg-muted/20 relative overflow-hidden font-sans select-none">
                            <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-muted-foreground mb-3 text-center">SIMULATED INVITE CARD</p>
                            
                            {/* Header Mockup */}
                            <div 
                              className="p-3 border border-border/40 flex items-center justify-between transition-all"
                              style={{ backgroundColor: branding.neutralColor || "#f7f5f1", borderLeft: `3px solid ${branding.primaryColor || "#18181b"}` }}
                            >
                              <div className="flex items-center gap-2">
                                {branding.logoUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={branding.logoUrl} alt="Logo" className="h-4 object-contain max-w-[80px]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                ) : (
                                  <div className="size-4 bg-foreground/15 flex items-center justify-center font-serif text-[8px]">S</div>
                                )}
                                <span className="text-[10px] font-bold text-foreground font-mono">{branding.senderName || "SleekSign"}</span>
                              </div>
                              <span className="text-[7px] font-mono px-1.5 py-0.5 bg-foreground/10 text-foreground font-bold">ENCRYPTED</span>
                            </div>

                            {/* Body Mockup */}
                            <div className="mt-3 p-4 bg-background border border-border/40 shadow-sm text-center">
                              <p className="text-[10px] text-muted-foreground leading-normal">
                                You are invited by <strong className="text-foreground">{branding.senderName || "SleekSign"}</strong> to execute:
                              </p>
                              <h4 className="text-[11px] font-bold mt-1 text-foreground">Offer_Letter_Pack.pdf</h4>
                              
                              <button
                                type="button"
                                disabled
                                className="mt-4 px-4 py-2 font-mono text-[9px] uppercase tracking-wider text-white font-bold transition-all opacity-95"
                                style={{ backgroundColor: branding.accentColor || "#ea580c" }}
                              >
                                Review & Sign Agreement
                              </button>
                            </div>

                            {/* Footer Mockup */}
                            <div className="mt-3 text-center">
                              <p className="text-[7px] text-muted-foreground leading-relaxed">
                                Questions? Support is active at <span className="text-foreground underline decoration-dotted font-mono">{branding.supportEmail || "support@sleeksign.com"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="p-3 bg-muted/10 text-[10px] leading-relaxed text-muted-foreground border-l border-border">
                            As you adjust your brand colors and credentials in the form, the simulated signer layout updates immediately.
                          </div>
                        </div>

                      </div>

                      {/* Custom Domain panel */}
                      <div className="bg-background p-5 space-y-4 border border-border/40 shadow-xs">
                        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                          <Globe className="size-4 text-orange-500" />
                          <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Custom Signature Domain</h2>
                        </div>

                        <div className="grid gap-4 max-w-4xl">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Fully white-label your document execution flow. Register a custom company sub-domain so your client signers never have to leave your branded environment.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              value={domainInput}
                              onChange={(event) => setDomainInput(event.target.value)}
                              placeholder="sign.yourcompany.com"
                              className="flex-1 border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors"
                            />
                            <Button
                              variant="outline"
                              disabled={isBusy || !domainInput.trim()}
                              onClick={() => void requestDomain()}
                              className="font-mono text-xs uppercase px-4 h-9 border-border/60 hover:border-foreground"
                            >
                              Request Challenge
                            </Button>
                          </div>

                          {domainToken && (
                            <div className="bg-muted/30 p-4 space-y-3 border-l-2 border-orange-500">
                              <div className="flex items-center gap-2">
                                <span className="size-1.5 bg-orange-500 animate-pulse" />
                                <p className="font-mono text-[9px] uppercase tracking-widest text-orange-500 font-bold">DNS Challenge Record Config</p>
                              </div>
                              <p className="text-xs text-muted-foreground leading-normal">
                                Create the following verification text record in your DNS provider control panel:
                              </p>

                              <div className="bg-background p-3 flex items-center justify-between font-mono text-[11px] relative overflow-hidden group border border-border/40">
                                <div className="absolute right-0 top-0 w-8 h-8 opacity-[0.02] bg-foreground sleek-grid pointer-events-none" />
                                <div className="truncate pr-4 leading-relaxed">
                                  <span className="text-muted-foreground">Type: </span><span className="text-foreground font-bold">TXT</span><br />
                                  <span className="text-muted-foreground">Host: </span><span className="text-foreground">_sleeksign-challenge.{domainInput || "yourdomain.com"}</span><br />
                                  <span className="text-muted-foreground">Value: </span><span className="text-foreground font-bold">{domainToken}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(domainToken);
                                    toast.success("Verification token copied");
                                  }}
                                  className="p-1.5 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors self-center"
                                  title="Copy DNS Token"
                                >
                                  <Copy className="size-3.5" />
                                </button>
                              </div>

                              <Button
                                disabled={isBusy || !domainToken}
                                onClick={() => void verifyDomain()}
                                className="w-full font-mono text-xs uppercase py-2 h-9"
                              >
                                Verify Challenge DNS
                              </Button>
                            </div>
                          )}

                          {branding.domain && (
                            <div className="border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all">
                              <div className="flex items-center gap-3">
                                <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-xs text-foreground font-medium">Domain Successfully Validated</span>
                              </div>
                              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{branding.domain}</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Audit Logs timeline */}
                  {activeSection === "audit" && (
                    <div className="bg-background p-6 space-y-6 border border-border/40 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                        <ShieldAlert className="size-4 text-orange-500" />
                        <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Enterprise Security Audit Logs</h2>
                      </div>
                      
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
                        Comprehensive administrative triggers and security highlights compiled dynamically from your workspace configuration logs.
                      </p>

                      <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                        {[
                          { event: "Signature Domain Challenge Issued", user: "chimezie@sleeksign.com", date: "2026-05-24 19:45:20", type: "DOMAIN", status: "info" },
                          { event: "Branding Configuration Modified", user: "chimezie@sleeksign.com", date: "2026-05-24 18:32:11", type: "PALETTE", status: "success" },
                          { event: "Workspace Member Invitation Created", user: "chimezie@sleeksign.com", date: "2026-05-24 16:11:04", type: "ACCESS", status: "success" },
                          { event: "New Security Team Registration", user: "system_cron", date: "2026-05-24 12:00:00", type: "TEAMS", status: "success" },
                          { event: "Enterprise License Verified", user: "billing_webhook", date: "2026-05-24 09:15:33", type: "LICENSE", status: "info" },
                        ].map((log, i) => (
                          <div key={i} className="flex gap-4 relative group">
                            <div className="size-7 bg-background border border-border/60 text-foreground flex items-center justify-center font-mono text-[9px] font-bold z-10 select-none group-hover:border-foreground/30 transition-colors">
                              {i + 1}
                            </div>
                            <div className="flex-1 bg-muted/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors border border-border/30">
                              <div>
                                <h4 className="text-xs font-bold text-foreground">{log.event}</h4>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Triggered by <span className="font-mono text-foreground font-medium">{log.user}</span>
                                </p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <span className="inline-block px-1.5 py-0.5 bg-muted font-mono text-[8px] uppercase tracking-wider text-muted-foreground border border-border/40">
                                  {log.type}
                                </span>
                                <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{log.date}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </main>

          </div>

        </div>

        {/* Member Permissions Drawer / Sheet */}
        <Sheet open={permissionsSheetOpen} onOpenChange={setPermissionsSheetOpen}>
          <SheetContent className="left-auto right-0 w-[min(92vw,30rem)] translate-x-full border-l border-r-0 rounded-none bg-background shadow-2xl p-0 border-border/40" hideCloseButton>
            <div className="h-full flex flex-col relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 opacity-[0.02] sleek-grid pointer-events-none" />
              
              {/* Header */}
              <div className="p-6 border-b border-border/40 space-y-2">
                <SheetTitle className="font-mono text-xs uppercase tracking-widest font-bold text-orange-500">Security Privileges</SheetTitle>
                <h3 className="text-lg font-light tracking-tight text-foreground">{selectedMember?.user?.name || "Workspace Member"}</h3>
                <p className="text-xs text-muted-foreground">
                  View and verify current access levels, team assignments, and security roles.
                </p>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedMember ? (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Contact Email</p>
                      <p className="text-sm font-medium text-foreground">{selectedMember.user?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Global Directory Role: <span className="font-mono text-foreground font-bold">{selectedMember.role.toUpperCase()}</span>
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground font-bold border-b border-border/40 pb-1.5">Assigned Roles & Capability Matrix</p>
                      {selectedMember.roleAssignments.length > 0 ? (
                        <div className="space-y-4">
                          {selectedMember.roleAssignments.map((assignment) => (
                            <div key={assignment.id} className="p-3.5 bg-muted/15 space-y-3 border-l-2 border-orange-500">
                              <div>
                                <p className="text-xs font-bold text-foreground">
                                  {assignment.role?.name || "Access Group"}
                                </p>
                                <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground mt-0.5">
                                  Scope: {assignment.teamId
                                    ? teams.find((team) => team.id === assignment.teamId)?.name || "Team Scoped"
                                    : "Global Workspace"}
                                </p>
                              </div>
                              <div className="space-y-1 border-t border-dashed border-border/40 pt-2.5">
                                <p className="font-mono text-[7px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">Granted Actions</p>
                                {(roles.find((role) => role.id === assignment.roleId)?.permissions || []).map((permission) => (
                                  <div key={`${assignment.id}-${permission}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="size-1 bg-foreground/30" />
                                    <span>{permission}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-border/40 border-dashed p-4 text-center">
                          <p className="text-xs text-muted-foreground leading-normal">
                            No granular custom permissions mapped to this profile yet.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Permission Glossary Section */}
                    <div className="space-y-3 pt-4 border-t border-dashed border-border/40">
                      <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground font-bold border-b border-border/40 pb-1.5">System Privilege Glossary</p>
                      <p className="text-[10px] text-muted-foreground leading-normal mb-2">
                        Understanding permissions scopes. The following administrative actions can be mapped to active roles:
                      </p>
                      
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {[
                          { key: "documents:view", desc: "Allows viewing templates and signature packets scoped specifically to the user's active team." },
                          { key: "documents:view_all", desc: "Grants access to inspect all corporate documents and signed folders globally." },
                          { key: "documents:manage", desc: "Full permissions to author, modify, delete, and archive source PDF configurations." },
                          { key: "templates:view", desc: "Enables viewing organization templates and mapping source variables." },
                          { key: "templates:manage", desc: "Allows creating, publishing, and archiving shared packet templates." },
                          { key: "packets:send", desc: "Grants permission to initialize collaborative signature flows and dispatch packages to clients." },
                          { key: "packets:view_all", desc: "Allows tracking and inspecting all outbound packets across all workspace departments." },
                          { key: "signers:view", desc: "View registered signer contact records active within the user's teams." },
                          { key: "signers:view_all", desc: "Inspect and search the global company signer directory." },
                          { key: "signers:manage", desc: "Register authorized signer credentials, create signing groups, and map custom teams." },
                          { key: "audit:view", desc: "Access scoped event summaries and signature audit logs for active documents." },
                          { key: "audit:view_all", desc: "Inspect global security events, config triggers, and export organization audit logs." },
                          { key: "teams:manage", desc: "Allows registering new departments, assigning users, and structuring permissions." },
                          { key: "branding:manage", desc: "Full access to visual theme settings, circular swatches, logos, and custom domains." },
                          { key: "billing:manage", desc: "Manage corporate subscriptions, access entitlement balances, and pricing options." },
                          { key: "members:manage", desc: "Onboard/invite colleagues, cancel pending invites, and modify security privileges." },
                        ].map((glossary) => (
                          <div key={glossary.key} className="p-2.5 bg-muted/5 space-y-1 border border-border/30">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] font-bold text-orange-500 uppercase tracking-wide px-1.5 py-0.5 border border-orange-500/20 bg-orange-500/5 select-all">
                                {glossary.key}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {glossary.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border/40 bg-muted/20 flex justify-end">
                <Button variant="outline" onClick={() => setPermissionsSheetOpen(false)} className="font-mono text-xs uppercase px-4 h-9 border-border/60 hover:border-foreground">
                  Close panel
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Workspace Delete Dialog */}
        <Dialog open={workspaceDeleteOpen} onOpenChange={(open) => {
          setWorkspaceDeleteOpen(open)
          if (!open) setWorkspaceConfirmInput("")
        }}>
          <DialogContent className="rounded-none border-border bg-popover shadow-sm">
            <DialogHeader>
              <DialogTitle className="font-mono text-xs uppercase tracking-widest text-destructive">
                Delete Workspace
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
                This will permanently delete the current workspace and all associated resources. To confirm, please type the workspace name: <strong className="text-foreground font-mono select-all bg-muted px-1 py-0.5">{authOrganizations?.find(o => o.id === workspaceId)?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <input
                value={workspaceConfirmInput}
                onChange={(e) => setWorkspaceConfirmInput(e.target.value)}
                placeholder="Workspace name"
                className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors rounded-none font-mono"
              />
            </div>
            <DialogFooter className="rounded-none border-border mt-4">
              <Button
                variant="outline"
                onClick={() => setWorkspaceDeleteOpen(false)}
                className="font-mono text-xs uppercase px-4 h-9 border-border/60"
              >
                Cancel
              </Button>
              <Button
                disabled={isBusy || workspaceConfirmInput.trim() !== authOrganizations?.find(o => o.id === workspaceId)?.name}
                onClick={() => void handleDeleteWorkspace()}
                className="font-mono text-xs uppercase px-4 h-9 bg-destructive hover:bg-destructive/90 text-white rounded-none border border-destructive/20"
              >
                Delete Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Account Delete Dialog */}
        <Dialog open={accountDeleteOpen} onOpenChange={(open) => {
          setAccountDeleteOpen(open)
          if (!open) setAccountConfirmInput("")
        }}>
          <DialogContent className="rounded-none border-border bg-popover shadow-sm">
            <DialogHeader>
              <DialogTitle className="font-mono text-xs uppercase tracking-widest text-destructive">
                Delete User Account
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
                This will permanently erase your personal account, credentials, and access rights. To confirm, please type <strong className="text-foreground font-mono select-all bg-muted px-1 py-0.5">DELETE MY ACCOUNT</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <input
                value={accountConfirmInput}
                onChange={(e) => setAccountConfirmInput(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="w-full border border-border/60 bg-background px-3 py-2 text-xs focus:border-foreground outline-none transition-colors rounded-none font-mono"
              />
            </div>
            <DialogFooter className="rounded-none border-border mt-4">
              <Button
                variant="outline"
                onClick={() => setAccountDeleteOpen(false)}
                className="font-mono text-xs uppercase px-4 h-9 border-border/60"
              >
                Cancel
              </Button>
              <Button
                disabled={isBusy || accountConfirmInput.trim() !== "DELETE MY ACCOUNT"}
                onClick={() => void handleDeleteAccount()}
                className="font-mono text-xs uppercase px-4 h-9 bg-destructive hover:bg-destructive/90 text-white rounded-none border border-destructive/20"
              >
                Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Member Dialog */}
        <Dialog open={Boolean(memberToRemove)} onOpenChange={(open) => {
          if (!open) setMemberToRemove(null)
        }}>
          <DialogContent className="rounded-none border-border bg-popover shadow-sm">
            <DialogHeader>
              <DialogTitle className="font-mono text-xs uppercase tracking-widest text-destructive">
                Remove Member
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Are you sure you want to remove <strong className="text-foreground">{memberToRemove?.user?.name || memberToRemove?.user?.email}</strong> from this workspace? They will instantly lose access to all resources.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="rounded-none border-border mt-4">
              <Button
                variant="outline"
                onClick={() => setMemberToRemove(null)}
                className="font-mono text-xs uppercase px-4 h-9 border-border/60"
              >
                Cancel
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => void handleRemoveMember()}
                className="font-mono text-xs uppercase px-4 h-9 bg-destructive hover:bg-destructive/90 text-white rounded-none border border-destructive/20"
              >
                Remove Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Team Dialog */}
        <Dialog open={Boolean(teamToDelete)} onOpenChange={(open) => {
          if (!open) setTeamToDelete(null)
        }}>
          <DialogContent className="rounded-none border-border bg-popover shadow-sm">
            <DialogHeader>
              <DialogTitle className="font-mono text-xs uppercase tracking-widest text-destructive">
                Delete Team
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Are you sure you want to delete the team <strong className="text-foreground">{teamToDelete?.name}</strong>? Any team-scoped permissions and mappings will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="rounded-none border-border mt-4">
              <Button
                variant="outline"
                onClick={() => setTeamToDelete(null)}
                className="font-mono text-xs uppercase px-4 h-9 border-border/60"
              >
                Cancel
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => void handleDeleteTeam()}
                className="font-mono text-xs uppercase px-4 h-9 bg-destructive hover:bg-destructive/90 text-white rounded-none border border-destructive/20"
              >
                Delete Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </HrShell>
  )
}



