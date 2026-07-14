<script lang="ts">
  import { browser } from "$app/environment";
  import {
    CopyIcon,
    FileArrowUpIcon,
    PaperPlaneTiltIcon,
    PencilSimpleIcon,
    ShieldCheckIcon,
    UploadSimpleIcon,
    XIcon,
  } from "phosphor-svelte";
  import { toast } from "svelte-sonner";
  import AuditTimeline from "$lib/components/docs/audit-timeline.svelte";
  import SignerTimeline from "$lib/components/docs/signer-timeline.svelte";
  import type { DocumentRecord } from "$lib/components/docs/types";
  import { getDocumentCounts } from "$lib/components/docs/types";
  import Button from "$lib/components/ui/button.svelte";
  import {
    areRoleConfigsEqual,
    type RoleConfig,
    type WorkflowMode,
  } from "$lib/field-utils";
  import { cn } from "$lib/utils";
  import { workspaceStore } from "$lib/workspace-store.svelte";

  type PacketSummary = {
    id: string;
    mode: WorkflowMode;
    status: string;
    roleConfigs: Array<{ name: string; scope: "shared" | "private" }>;
  };

  type TeamRecord = { id: string; name: string };

  type AuditRecord = {
    id: string;
    eventType: string;
    actorEmail?: string | null;
    createdAt: string;
    ipAddress?: string | null;
  };

  type BulkSendJob = {
    id: string;
    status: string;
    totalRows: number;
    createdCount: number;
    sentCount: number;
    signedCount: number;
    failedCount: number;
  };

  type DirectorySigner = { id: string; name: string; email: string };
  type SignerGroupRecord = {
    id: string;
    name: string;
    signers: DirectorySigner[];
  };
  type BulkBusyAction = "" | "parse" | "send" | "draft";
  type TabValue = "overview" | "link" | "bulk" | "activity";
  type ActivityView = "audit" | "signer";
  type SendPath = "email" | "signer" | "group";

  const SEND_PATHS: Array<{ id: SendPath; label: string }> = [
    { id: "email", label: "Single email" },
    { id: "signer", label: "Single signer" },
    { id: "group", label: "Group" },
  ];

  const ACTIVITY_VIEWS: Array<{ id: ActivityView; label: string }> = [
    { id: "audit", label: "Audit trail" },
    { id: "signer", label: "Signer Timeline" },
  ];

  let {
    document: doc,
    canShare = true,
    onEdit,
    onClose,
  }: {
    document?: DocumentRecord;
    canShare?: boolean;
    onEdit: () => void;
    onClose?: () => void;
  } = $props();

  let activeTab = $state<TabValue>("overview");
  let activityView = $state<ActivityView>("audit");
  let isCreatingPacket = $state(false);
  let selectedMode = $state<WorkflowMode>("individual");
  let documentOverrides = $state<{
    documentId: string;
    teamId: string | null;
    requireOtp: boolean | null;
  }>({ documentId: "", teamId: null, requireOtp: null });

  let packets = $state<PacketSummary[]>([]);
  let auditLogs = $state<AuditRecord[]>([]);
  let jobs = $state<BulkSendJob[]>([]);
  let teams = $state<TeamRecord[]>([]);
  let directorySigners = $state<DirectorySigner[]>([]);
  let signerGroups = $state<SignerGroupRecord[]>([]);

  let csvFile = $state<File | null>(null);
  let csvPreview = $state<Array<Record<string, unknown>>>([]);
  let csvText = $state("");
  let nameColumn = $state("name");
  let emailColumn = $state("email");
  let roleColumn = $state("role");
  let defaultRoleName = $state("");
  let bulkBusyAction = $state<BulkBusyAction>("");

  let sendPath = $state<SendPath>("email");
  let recipientName = $state("");
  let recipientEmail = $state("");
  let selectedSignerId = $state("");
  let selectedGroupId = $state("");
  let sendRoleName = $state("");
  let sendBusy = $state(false);

  const workspaceId = $derived(workspaceStore.workspaceId);
  const bulkBusy = $derived(Boolean(bulkBusyAction));
  const roleConfigs = $derived((doc?.roleConfigs || []) as RoleConfig[]);
  const selectedPacket = $derived(
    doc
      ? packets.find(
          (packet) =>
            packet.mode === selectedMode &&
            areRoleConfigsEqual(packet.roleConfigs, roleConfigs),
        ) || null
      : null,
  );
  const counts = $derived(doc ? getDocumentCounts(doc) : null);
  const privateRoles = $derived(
    roleConfigs.filter((role) => role.scope === "private"),
  );
  const selectedTeamId = $derived(
    doc && documentOverrides.documentId === doc.id
      ? (documentOverrides.teamId ?? doc.teamId ?? "")
      : (doc?.teamId ?? ""),
  );
  const requireOtp = $derived(
    doc && documentOverrides.documentId === doc.id
      ? (documentOverrides.requireOtp ?? Boolean(doc.requireOtp))
      : Boolean(doc?.requireOtp),
  );

  const modeOptions = [
    {
      mode: "individual" as WorkflowMode,
      tab: "Individual",
      title: "Individual Copies",
      copy: "Each signer gets a clean isolated copy. Nobody sees any other signer on their document.",
    },
    {
      mode: "collaborative" as WorkflowMode,
      tab: "Collaborative",
      title: "Collaborative Packet",
      copy: "Everyone signs the same live document and sees the other shared signers on the same PDF.",
    },
    {
      mode: "shared-base" as WorkflowMode,
      tab: "Shared",
      title: "Shared Base + Recipient Copies",
      copy: "Shared roles sign once, then each recipient signs their own copy with those shared signatures already visible.",
    },
  ];

  const selectedModeIndex = $derived(
    Math.max(
      0,
      modeOptions.findIndex((option) => option.mode === selectedMode),
    ),
  );
  const sendPathIndex = $derived(
    Math.max(
      0,
      SEND_PATHS.findIndex((path) => path.id === sendPath),
    ),
  );
  const activityViewIndex = $derived(
    Math.max(
      0,
      ACTIVITY_VIEWS.findIndex((view) => view.id === activityView),
    ),
  );

  let csvInputEl = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (!browser || !doc) return;
    const documentId = doc.id;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `/api/signing-packets?documentId=${encodeURIComponent(documentId)}`,
        );
        const data = await res.json();
        if (!cancelled) packets = Array.isArray(data) ? data : [];
      } catch {
        if (!cancelled) packets = [];
      }
    })();

    void (async () => {
      try {
        const res = await fetch(
          `/api/bulk-send/jobs?documentId=${encodeURIComponent(documentId)}`,
        );
        const data = await res.json();
        if (!cancelled) jobs = Array.isArray(data) ? data : [];
      } catch {
        if (!cancelled) jobs = [];
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!browser || !doc || !workspaceId) return;
    const documentId = doc.id;
    const ws = workspaceId;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `/api/audit?documentId=${encodeURIComponent(documentId)}&workspaceId=${encodeURIComponent(ws)}`,
        );
        const data = await res.json();
        if (!cancelled) auditLogs = Array.isArray(data) ? data : [];
      } catch {
        if (!cancelled) auditLogs = [];
      }
    })();

    void (async () => {
      try {
        const res = await fetch(
          `/api/teams?workspaceId=${encodeURIComponent(ws)}&summary=1`,
        );
        const data = await res.json();
        if (!cancelled) teams = Array.isArray(data?.teams) ? data.teams : [];
      } catch {
        if (!cancelled) teams = [];
      }
    })();

    void (async () => {
      try {
        const res = await fetch(
          `/api/signers/directory?workspaceId=${encodeURIComponent(ws)}`,
        );
        const data = await res.json();
        if (!cancelled)
          directorySigners = Array.isArray(data?.signers) ? data.signers : [];
      } catch {
        if (!cancelled) directorySigners = [];
      }
    })();

    void (async () => {
      try {
        const res = await fetch(
          `/api/signer-groups?workspaceId=${encodeURIComponent(ws)}`,
        );
        const data = await res.json();
        if (!cancelled)
          signerGroups = Array.isArray(data?.groups) ? data.groups : [];
      } catch {
        if (!cancelled) signerGroups = [];
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  async function persistDocumentSettings(next: {
    teamId?: string | null;
    requireOtp?: boolean;
  }) {
    if (!doc) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: next.teamId ?? selectedTeamId ?? null,
          requireOtp:
            typeof next.requireOtp === "boolean" ? next.requireOtp : requireOtp,
        }),
      });
      if (!res.ok) throw new Error("Unable to update document");
      toast.success("Document settings updated");
    } catch {
      toast.error("Unable to update document settings");
    }
  }

  async function parseCsvPreview() {
    if (!csvFile || !doc) {
      toast.error("Choose a CSV file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", csvFile);
    formData.append("documentId", doc.id);
    formData.append("nameColumn", nameColumn);
    formData.append("emailColumn", emailColumn);
    formData.append("roleColumn", roleColumn);
    formData.append("defaultRoleName", defaultRoleName);

    bulkBusyAction = "parse";
    try {
      const res = await fetch("/api/bulk-send/parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to parse CSV");
      csvPreview = Array.isArray(data.preview?.recipients)
        ? data.preview.recipients
        : [];
      csvText = String(data.csvText || "");
      toast.success("CSV parsed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to parse CSV",
      );
    } finally {
      bulkBusyAction = "";
    }
  }

  async function createBulkJob(sendImmediately: boolean) {
    if (!csvText || !doc) {
      toast.error("Parse a CSV file before creating a bulk send job");
      return;
    }

    bulkBusyAction = sendImmediately ? "send" : "draft";
    try {
      const res = await fetch("/api/bulk-send/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
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
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create job");
      toast.success(
        sendImmediately ? "Bulk send started" : "Bulk draft created",
      );
      const jobsRes = await fetch(
        `/api/bulk-send/jobs?documentId=${encodeURIComponent(doc.id)}`,
      );
      const jobsData = await jobsRes.json();
      jobs = Array.isArray(jobsData) ? jobsData : [];
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create job",
      );
    } finally {
      bulkBusyAction = "";
    }
  }

  function guardShareAction(action: () => void) {
    if (!canShare) {
      toast.error("Assign all fields before sharing this document");
      return;
    }
    action();
  }

  async function ensurePacket(mode: WorkflowMode) {
    if (!doc) return null;

    const existingPacket = packets.find(
      (packet) =>
        packet.mode === mode &&
        areRoleConfigsEqual(packet.roleConfigs, roleConfigs),
    );
    if (existingPacket) return existingPacket;

    isCreatingPacket = true;
    try {
      const res = await fetch("/api/signing-packets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          mode,
          roleConfigs,
        }),
      });
      const data = await res.json();
      if (!data.packetId) throw new Error("Failed to create packet");

      const packet: PacketSummary = {
        id: data.packetId,
        mode,
        status: "active",
        roleConfigs,
      };
      packets = [packet, ...packets];
      toast.success("Share packet created");
      return packet;
    } catch {
      toast.error("Unable to create share packet");
      return null;
    } finally {
      isCreatingPacket = false;
    }
  }

  function getPacketRoleLinks(packet: PacketSummary) {
    if (!doc || !browser) return [];
    const origin = window.location.origin;
    // Entry page collects signer identity, creates a private copy when needed,
    // then routes into /sign/packet — works for individual, collaborative, and shared-base.
    return packet.roleConfigs.map((role) => ({
      role,
      url: `${origin}/sign/p/${doc.id}?packet=${encodeURIComponent(packet.id)}&role=${encodeURIComponent(role.name)}`,
    }));
  }

  async function sendDocumentNow() {
    if (!doc) return;

    const roleName =
      sendRoleName || privateRoles[0]?.name || roleConfigs[0]?.name || "";
    if (!roleName) {
      toast.error("Choose a signer role before sending");
      return;
    }

    const targets =
      sendPath === "email"
        ? recipientEmail.trim()
          ? [
              {
                kind: "email" as const,
                name: recipientName.trim() || roleName,
                email: recipientEmail.trim(),
                roleName,
              },
            ]
          : []
        : sendPath === "signer"
          ? selectedSignerId
            ? [
                {
                  kind: "signer" as const,
                  signerId: selectedSignerId,
                  roleName,
                },
              ]
            : []
          : selectedGroupId
            ? [{ kind: "group" as const, groupId: selectedGroupId, roleName }]
            : [];

    if (targets.length === 0) {
      toast.error("Choose a recipient before sending");
      return;
    }

    sendBusy = true;
    try {
      const res = await fetch("/api/send-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          mode: selectedMode,
          targets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to send document");
      toast.success("Document sent");
      recipientName = "";
      recipientEmail = "";
      selectedSignerId = "";
      selectedGroupId = "";
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send document",
      );
    } finally {
      sendBusy = false;
    }
  }
</script>

{#if !doc}
  <aside
    class="flex h-full min-h-[320px] min-w-0 items-center justify-center bg-card p-4"
  >
    <div
      class="flex h-full w-full items-center justify-center border border-dashed border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
    >
      Select a document.
    </div>
  </aside>
{:else}
  <aside
    class="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-x-hidden bg-card"
  >
    <div class="px-5 pb-3 pt-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="truncate text-xs font-semibold uppercase tracking-widest">
            {doc.name}
          </h2>
          <p
            class="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Share package
          </p>
        </div>
        {#if onClose}
          <Button
            variant="ghost"
            size="icon"
            onclick={onClose}
            aria-label="Close"
          >
            <XIcon class="size-4" />
          </Button>
        {/if}
      </div>
    </div>

    <div class="min-h-0 overflow-auto px-5 pb-5">
      <div class="flex min-w-0 flex-col gap-4">
        <div
          class="grid w-full min-w-0 grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1 sm:grid-cols-4"
        >
          {#each [{ id: "overview", label: "Overview" }, { id: "link", label: "Link" }, { id: "bulk", label: "Bulk Send" }, { id: "activity", label: "Audit" }] as tab (tab.id)}
            <button
              type="button"
              onclick={() => (activeTab = tab.id as TabValue)}
              class="rounded-md px-2 py-1.5 text-xs font-medium transition-colors {activeTab ===
              tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}"
            >
              {tab.label}
            </button>
          {/each}
        </div>

        {#if activeTab === "overview" && counts}
          <div class="flex flex-col gap-6 pt-1">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="bg-background p-3 shadow-sm">
                <p
                  class="font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
                >
                  Fields
                </p>
                <p class="mt-2 truncate font-mono text-sm text-foreground">
                  {counts.fields}
                </p>
              </div>
              <div class="bg-background p-3 shadow-sm">
                <p
                  class="font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
                >
                  File type
                </p>
                <p class="mt-2 truncate font-mono text-sm text-foreground">
                  {doc.name.split(".").pop()?.toUpperCase() || "PDF"}
                </p>
              </div>
            </div>

            <div class="grid gap-4 bg-muted/35 p-4">
              <h2
                class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Overview
              </h2>

              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <h2
                    class="font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
                  >
                    Team
                  </h2>
                  <p class="mt-1 text-sm font-medium text-foreground">
                    {teams.find((team) => team.id === selectedTeamId)?.name ||
                      "Unassigned"}
                  </p>
                </div>
                <div>
                  <h2
                    class="font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
                  >
                    Verification
                  </h2>
                  <p class="mt-1 text-sm font-medium text-foreground">
                    {requireOtp ? "Email OTP required" : "No OTP"}
                  </p>
                </div>
              </div>

              <label class="grid gap-2 text-sm my-4">
                <span class="font-medium">Team ownership</span>
                <select
                  value={selectedTeamId}
                  onchange={(event) => {
                    const nextTeamId = event.currentTarget.value;
                    documentOverrides = {
                      documentId: doc.id,
                      teamId: nextTeamId,
                      requireOtp:
                        documentOverrides.documentId === doc.id
                          ? documentOverrides.requireOtp
                          : Boolean(doc.requireOtp),
                    };
                    void persistDocumentSettings({
                      teamId: nextTeamId || null,
                    });
                  }}
                  class="rounded-sm! bg-background h-32 border"
                >
                  <option value="">Unassigned</option>
                  {#each teams as team (team.id)}
                    <option value={team.id}>{team.name}</option>
                  {/each}
                </select>
              </label>

              <label class="flex items-center justify-between gap-3 text-sm">
                <div>
                  <h2 class="font-medium">Require email OTP before viewing</h2>
                  <p class="text-muted-foreground">
                    Signers must verify a 6-digit email code before the document
                    loads.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requireOtp}
                  onchange={(event) => {
                    const nextValue = event.currentTarget.checked;
                    documentOverrides = {
                      documentId: doc.id,
                      teamId:
                        documentOverrides.documentId === doc.id
                          ? documentOverrides.teamId
                          : (doc.teamId ?? ""),
                      requireOtp: nextValue,
                    };
                    void persistDocumentSettings({ requireOtp: nextValue });
                  }}
                  class="size-4"
                />
              </label>
            </div>
          </div>
        {:else if activeTab === "link"}
          <div class="flex flex-col gap-4">
            <p class="text-sm text-muted-foreground">
              How do you want to share this document?
            </p>

            <div class="relative grid grid-cols-3 border-b border-border">
              {#each modeOptions as option (option.mode)}
                <button
                  type="button"
                  onclick={() => (selectedMode = option.mode)}
                  class={cn(
                    "pb-2.5 text-center text-[12px] transition-colors",
                    selectedMode === option.mode
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.tab}
                </button>
              {/each}
              <div
                class="pointer-events-none absolute bottom-0 left-0 h-0.5 w-1/3 bg-foreground transition-transform duration-300 ease-out"
                style={`transform: translateX(${selectedModeIndex * 100}%)`}
              ></div>
            </div>

            <div class="overflow-hidden">
              <div
                class="flex transition-transform duration-300 ease-out"
                style={`transform: translateX(-${selectedModeIndex * 100}%)`}
              >
                {#each modeOptions as option (option.mode)}
                  <div class="w-full shrink-0 px-0.5">
                    <h2 class="mt-1 text-sm font-medium text-foreground">
                      {option.title}
                    </h2>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {option.copy}
                    </p>
                  </div>
                {/each}
              </div>
            </div>

            <div class="flex items-start justify-between gap-3 mt-4">
              <div>
                <h2
                  class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Active packet
                </h2>
                <p class="mt-2 text-sm text-foreground">
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
                onclick={() =>
                  guardShareAction(() => {
                    void ensurePacket(selectedMode);
                  })}
              >
                {selectedPacket ? "Reuse Packet" : "Create Packet"}
              </Button>
            </div>

            {#if selectedPacket}
              <div class="grid gap-2">
                <p
                  class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Role links
                </p>
                {#each getPacketRoleLinks(selectedPacket) as { role, url } (`${selectedPacket.id}-${role.name}`)}
                  <div
                    class="grid min-w-0 grid-cols-1 gap-2 rounded-3xl bg-background p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div class="min-w-0">
                      <p
                        class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                      >
                        {role.name} · {role.scope === "shared"
                          ? "Shared"
                          : "Private"}
                      </p>
                      <p
                        class="mt-1 truncate font-mono text-xs text-foreground"
                      >
                        {url}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      class="w-full sm:w-auto"
                      disabled={!canShare}
                      onclick={() =>
                        guardShareAction(() => {
                          void navigator.clipboard.writeText(url);
                          toast.success(`${role.name} link copied`);
                        })}
                    >
                      <CopyIcon class="size-4" />
                      Copy
                    </Button>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">
                Create a packet for this workflow to generate signing links.
              </p>
            {/if}
          </div>
        {:else if activeTab === "bulk"}
          <div class="flex flex-col gap-4">
            <div>
              <p
                class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Send document
              </p>
              <div class="mt-3 grid gap-3">
                <div>
                  <div class="relative grid grid-cols-3 border-b border-border">
                    {#each SEND_PATHS as path (path.id)}
                      <button
                        type="button"
                        onclick={() => (sendPath = path.id)}
                        class={cn(
                          "pb-2.5 text-center text-[12px] transition-colors",
                          sendPath === path.id
                            ? "font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {path.label}
                      </button>
                    {/each}
                    <div
                      class="pointer-events-none absolute bottom-0 left-0 h-0.5 w-1/3 bg-foreground transition-transform duration-300 ease-out"
                      style={`transform: translateX(${sendPathIndex * 100}%)`}
                    ></div>
                  </div>

                  <div class="mt-3 overflow-hidden">
                    <div
                      class="flex transition-transform duration-300 ease-out"
                      style={`transform: translateX(-${sendPathIndex * 100}%)`}
                    >
                      <div class="w-full shrink-0 pr-1">
                        <div class="grid gap-3 sm:grid-cols-2">
                          <input
                            value={recipientName}
                            oninput={(e) =>
                              (recipientName = e.currentTarget.value)}
                            placeholder="Recipient name"
                            class="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                          />
                          <input
                            value={recipientEmail}
                            oninput={(e) =>
                              (recipientEmail = e.currentTarget.value)}
                            placeholder="Recipient email"
                            class="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div class="w-full shrink-0 px-1">
                        <select
                          value={selectedSignerId}
                          onchange={(e) =>
                            (selectedSignerId = e.currentTarget.value)}
                          class="w-full rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                        >
                          <option value="">Choose a workspace signer</option>
                          {#each directorySigners as signer (signer.id)}
                            <option value={signer.id}
                              >{signer.name} · {signer.email}</option
                            >
                          {/each}
                        </select>
                      </div>
                      <div class="w-full shrink-0 pl-1">
                        <select
                          value={selectedGroupId}
                          onchange={(e) =>
                            (selectedGroupId = e.currentTarget.value)}
                          class="w-full rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                        >
                          <option value="">Choose a signer group</option>
                          {#each signerGroups as group (group.id)}
                            <option value={group.id}
                              >{group.name} · {group.signers.length} signers</option
                            >
                          {/each}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    value={sendRoleName}
                    onchange={(e) => (sendRoleName = e.currentTarget.value)}
                    class="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  >
                    <option value="">Choose recipient role</option>
                    {#each privateRoles as role (role.name)}
                      <option value={role.name}>{role.name}</option>
                    {/each}
                  </select>
                  <Button
                    disabled={!canShare || sendBusy}
                    loading={sendBusy}
                    loadingText="Sending..."
                    onclick={() => void sendDocumentNow()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <p
                class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                CSV upload
              </p>
              <div class="mt-3 grid gap-3">
                <button
                  type="button"
                  class="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-foreground/30 hover:bg-muted/40"
                  onclick={() => csvInputEl?.click()}
                  ondragover={(event) => {
                    event.preventDefault();
                  }}
                  ondrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer?.files?.[0];
                    if (
                      file &&
                      (file.type.includes("csv") || file.name.endsWith(".csv"))
                    ) {
                      csvFile = file;
                    } else {
                      toast.error("Please drop a .csv file");
                    }
                  }}
                >
                  <span
                    class="flex size-10 items-center justify-center rounded-full bg-background text-foreground shadow-sm"
                  >
                    <FileArrowUpIcon class="size-5" />
                  </span>
                  {#if csvFile}
                    <span class="text-sm font-medium">{csvFile.name}</span>
                    <span class="text-xs text-muted-foreground"
                      >Click to choose a different CSV</span
                    >
                  {:else}
                    <span class="text-sm font-medium"
                      >Click to upload a CSV file</span
                    >
                    <span class="text-xs text-muted-foreground"
                      >Drag recipients here — name, email, and role columns</span
                    >
                  {/if}
                </button>
                <input
                  bind:this={csvInputEl}
                  type="file"
                  accept=".csv,text/csv"
                  class="sr-only"
                  onchange={(event) =>
                    (csvFile = event.currentTarget.files?.[0] || null)}
                />
                <div class="grid grid-cols-2 gap-3">
                  <input
                    value={nameColumn}
                    oninput={(e) => (nameColumn = e.currentTarget.value)}
                    placeholder="Name column"
                    class="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  />
                  <input
                    value={emailColumn}
                    oninput={(e) => (emailColumn = e.currentTarget.value)}
                    placeholder="Email column"
                    class="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  />
                  <input
                    value={roleColumn}
                    oninput={(e) => (roleColumn = e.currentTarget.value)}
                    placeholder="Role column"
                    class="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  />
                  <select
                    value={defaultRoleName}
                    onchange={(e) => (defaultRoleName = e.currentTarget.value)}
                    class="rounded-2xl bg-muted/35 px-3 py-2 text-sm"
                  >
                    <option value="">Default role (optional)</option>
                    {#each privateRoles as role (role.name)}
                      <option value={role.name}>{role.name}</option>
                    {/each}
                  </select>
                </div>
                <div class="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant="outline"
                    disabled={bulkBusy}
                    loading={bulkBusyAction === "parse"}
                    loadingText="Parsing..."
                    onclick={() => void parseCsvPreview()}
                  >
                    <UploadSimpleIcon class="size-4" />
                    Parse CSV
                  </Button>
                  <Button
                    disabled={bulkBusy || !csvText}
                    loading={bulkBusyAction === "send"}
                    loadingText="Sending..."
                    onclick={() => void createBulkJob(true)}
                  >
                    Send now
                  </Button>
                  <Button
                    variant="outline"
                    disabled={bulkBusy || !csvText}
                    loading={bulkBusyAction === "draft"}
                    loadingText="Saving..."
                    onclick={() => void createBulkJob(false)}
                  >
                    Save draft
                  </Button>
                </div>
              </div>
            </div>

            {#if csvPreview.length > 0}
              <div>
                <h2
                  class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Preview
                </h2>
                <div class="mt-3 grid gap-2">
                  {#each csvPreview.slice(0, 5) as row, index (`${String(row.signerEmail || index)}-${index}`)}
                    <div class="rounded-2xl bg-muted/35 px-3 py-2 text-sm">
                      {String(row.signerName || "Recipient")} · {String(
                        row.roleName || "Role",
                      )} ·
                      {String(row.signerEmail || "")}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="mt-4">
              <h2
                class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Job status
              </h2>
              <div class="mt-3 grid gap-2">
                {#if jobs.length === 0}
                  <p class="text-sm text-muted-foreground">
                    No bulk send jobs yet.
                  </p>
                {:else}
                  {#each jobs as job (job.id)}
                    <div class="rounded-2xl bg-muted/35 p-3">
                      <p
                        class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                      >
                        {job.status}
                      </p>
                      <p class="mt-2 text-sm">
                        {job.createdCount}/{job.totalRows} created · {job.sentCount}
                        sent ·
                        {job.failedCount} failed
                      </p>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>
          </div>
        {:else if activeTab === "activity"}
          <div>
            <div class="relative grid grid-cols-2 border-b border-border">
              {#each ACTIVITY_VIEWS as view (view.id)}
                <button
                  type="button"
                  onclick={() => (activityView = view.id)}
                  class={cn(
                    "pb-2.5 text-center text-[12px] transition-colors",
                    activityView === view.id
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {view.label}
                </button>
              {/each}
              <div
                class="pointer-events-none absolute bottom-0 left-0 h-0.5 w-1/2 bg-foreground transition-transform duration-300 ease-out"
                style={`transform: translateX(${activityViewIndex * 100}%)`}
              ></div>
            </div>

            <div class="mt-4 overflow-hidden">
              <div
                class="flex transition-transform duration-300 ease-out"
                style={`transform: translateX(-${activityViewIndex * 100}%)`}
              >
                <div class="w-full shrink-0 pr-1">
                  <AuditTimeline logs={auditLogs} />
                </div>
                <div class="w-full shrink-0 pl-1">
                  <SignerTimeline sessions={doc.sessions || []} />
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="grid gap-3 px-5 pb-5">
      {#if !canShare}
        <p
          class="font-mono text-[10px] uppercase tracking-widest text-destructive"
        >
          Assign every field before sharing links.
        </p>
      {/if}
      <Button variant="outline" onclick={onEdit}>
        <PencilSimpleIcon class="size-4" />
        Continue Editing
      </Button>
    </div>
  </aside>
{/if}
