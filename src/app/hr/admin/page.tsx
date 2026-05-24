"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { HrShell } from "@/components/hr/hr-shell"
import { Button } from "@/components/ui/button"
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

export default function EnterpriseAdminPage() {
  const workspaceId = useCurrentWorkspaceId()
  const [query, setQuery] = useState("")
  const [teams, setTeams] = useState<TeamPayload[]>([])
  const [roles, setRoles] = useState<RolePayload[]>([])
  const [members, setMembers] = useState<MemberPayload[]>([])
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
  const [isBusy, setIsBusy] = useState(false)
  const [selectedRoleByMember, setSelectedRoleByMember] = useState<Record<string, string>>({})
  const [selectedMembersByTeam, setSelectedMembersByTeam] = useState<Record<string, string[]>>({})

  async function loadEnterpriseData(targetWorkspaceId: string) {
    const [teamsRes, brandingRes] = await Promise.all([
      fetch(`/api/teams?workspaceId=${encodeURIComponent(targetWorkspaceId)}`),
      fetch(`/api/branding?workspaceId=${encodeURIComponent(targetWorkspaceId)}`),
    ])
    const teamsData = await teamsRes.json()
    const brandingData = await brandingRes.json()

    return {
      teams: Array.isArray(teamsData.teams) ? teamsData.teams : [],
      roles: Array.isArray(teamsData.roles) ? teamsData.roles : [],
      members: Array.isArray(teamsData.members) ? teamsData.members : [],
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
      setSelectedMembersByTeam(
        Object.fromEntries(
          data.teams.map((team: TeamPayload) => [team.id, Array.isArray(team.memberIds) ? team.memberIds : []]),
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
    setSelectedMembersByTeam(
      Object.fromEntries(
        refreshedData.teams.map((team: TeamPayload) => [
          team.id,
          Array.isArray(team.memberIds) ? team.memberIds : [],
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
      <section className="min-h-0 overflow-auto bg-[var(--paper)] px-4 py-4 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="grid gap-6">
            <div className="border border-border bg-background p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-orange-500">
                Teams and access
              </p>
              <h1 className="mt-2 text-xl font-semibold">Enterprise controls</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage team boundaries and the permission roles available inside this workspace.
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                  placeholder="Create a team"
                  className="flex-1 border border-border bg-background px-3 py-2 text-sm"
                />
                <Button disabled={isBusy} onClick={() => void createTeam()}>
                  Add team
                </Button>
              </div>
              <div className="mt-4 grid gap-3">
                {teams.map((team) => (
                  <div key={team.id} className="border border-border px-3 py-3">
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {team.description || (team.isDefault ? "Default team" : "Custom team")}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {members.map((member) => {
                        const checked = (selectedMembersByTeam[team.id] || []).includes(member.id)
                        return (
                          <label key={`${team.id}-${member.id}`} className="flex items-center gap-2 text-sm">
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
                            />
                            <span>{member.user?.name || member.user?.email || "Member"}</span>
                          </label>
                        )
                      })}
                    </div>
                    <Button
                      className="mt-3"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => void saveTeamMembers(team.id)}
                    >
                      Save team members
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Permission roles
                </p>
                {roles.map((role) => (
                  <div key={role.id} className="border border-border px-3 py-3">
                    <p className="font-medium">{role.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {role.permissions.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-border bg-background p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Members
              </p>
              <div className="mt-4 grid gap-3">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="border border-border px-3 py-3">
                    <p className="font-medium">{member.user?.name || "Workspace member"}</p>
                    <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Workspace role: {member.role}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Teams: {member.teamIds.length > 0 ? member.teamIds.length : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Permission assignments:{" "}
                      {member.roleAssignments.length > 0
                        ? member.roleAssignments.map((assignment) => assignment.role?.name || "Role").join(", ")
                        : "None"}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <select
                        value={selectedRoleByMember[member.id] || ""}
                        onChange={(event) =>
                          setSelectedRoleByMember((current) => ({
                            ...current,
                            [member.id]: event.target.value,
                          }))
                        }
                        className="flex-1 border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Assign permission role</option>
                        {roles
                          .filter((role) => role.name !== "Team Manager")
                          .map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                      </select>
                      <Button
                        variant="outline"
                        disabled={isBusy || !selectedRoleByMember[member.id]}
                        onClick={() => void assignRole(member.id)}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="border border-border bg-background p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-orange-500">
                White-label
              </p>
              <h2 className="mt-2 text-lg font-semibold">Branding</h2>
              <div className="mt-4 grid gap-3">
                <input
                  value={branding.senderName}
                  onChange={(event) =>
                    setBranding((current) => ({ ...current, senderName: event.target.value }))
                  }
                  placeholder="Sender name"
                  className="border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={branding.logoUrl || ""}
                  onChange={(event) =>
                    setBranding((current) => ({ ...current, logoUrl: event.target.value }))
                  }
                  placeholder="Logo URL"
                  className="border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={branding.supportEmail || ""}
                  onChange={(event) =>
                    setBranding((current) => ({ ...current, supportEmail: event.target.value }))
                  }
                  placeholder="Support email"
                  className="border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(event) =>
                      setBranding((current) => ({ ...current, primaryColor: event.target.value }))
                    }
                    className="h-10 w-full border border-border bg-background p-1"
                  />
                  <input
                    type="color"
                    value={branding.secondaryColor}
                    onChange={(event) =>
                      setBranding((current) => ({ ...current, secondaryColor: event.target.value }))
                    }
                    className="h-10 w-full border border-border bg-background p-1"
                  />
                  <input
                    type="color"
                    value={branding.neutralColor}
                    onChange={(event) =>
                      setBranding((current) => ({ ...current, neutralColor: event.target.value }))
                    }
                    className="h-10 w-full border border-border bg-background p-1"
                  />
                  <input
                    type="color"
                    value={branding.accentColor}
                    onChange={(event) =>
                      setBranding((current) => ({ ...current, accentColor: event.target.value }))
                    }
                    className="h-10 w-full border border-border bg-background p-1"
                  />
                </div>
                <Button disabled={isBusy} onClick={() => void saveBranding()}>
                  Save branding
                </Button>
              </div>
            </div>

            <div className="border border-border bg-background p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Custom domain
              </p>
              <div className="mt-4 grid gap-3">
                <input
                  value={domainInput}
                  onChange={(event) => setDomainInput(event.target.value)}
                  placeholder="sign.yourcompany.com"
                  className="border border-border bg-background px-3 py-2 text-sm"
                />
                <Button variant="outline" disabled={isBusy} onClick={() => void requestDomain()}>
                  Create verification challenge
                </Button>
                {domainToken ? (
                  <div className="border border-border bg-muted/20 p-3 text-sm">
                    Add this token to your DNS verification flow: <span className="font-mono">{domainToken}</span>
                  </div>
                ) : null}
                <Button disabled={isBusy || !domainToken} onClick={() => void verifyDomain()}>
                  Mark domain verified
                </Button>
                {branding.domain ? (
                  <p className="text-sm text-muted-foreground">
                    Active verified domain: {branding.domain}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </HrShell>
  )
}
