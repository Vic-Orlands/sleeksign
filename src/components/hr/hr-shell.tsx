"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2Icon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronRightIcon,
  Clock3Icon,
  FileTextIcon,
  LayoutListIcon,
  LoaderCircleIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  setCurrentWorkspaceId,
  useCurrentWorkspaceId,
} from "@/lib/workspace-store";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

type WorkspaceRole = "owner" | "admin" | "member" | string;

type WorkspaceMember = {
  id: string;
  organizationId: string;
  role: WorkspaceRole;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
};

type WorkspaceInvitation = {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  expiresAt: string;
  createdAt: string;
};

async function fetchWorkspaceRequest<T>(path: string) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Workspace request failed");
  }

  return response.json() as Promise<T>;
}

async function loadWorkspaceAccessSnapshot(workspaceId: string) {
  await authClient.$fetch("/organization/set-active", {
    method: "POST",
    body: { organizationId: workspaceId },
  });

  const [roleData, memberData, invitationData] = await Promise.all([
    fetchWorkspaceRequest<{ role?: string }>(
      "/api/auth/organization/get-active-member-role",
    ),
    fetchWorkspaceRequest<{ members: WorkspaceMember[] }>(
      `/api/auth/organization/list-members?organizationId=${encodeURIComponent(workspaceId)}`,
    ),
    fetchWorkspaceRequest<WorkspaceInvitation[]>(
      `/api/auth/organization/list-invitations?organizationId=${encodeURIComponent(workspaceId)}`,
    ),
  ]);

  return {
    role: roleData.role || "member",
    members: memberData.members || [],
    invitations: Array.isArray(invitationData) ? invitationData : [],
  };
}

type HrShellProps = {
  children: React.ReactNode;
  query: string;
  onQueryChange: (query: string) => void;
  onUpload: (file: File) => void;
  actionOverlay?: {
    visible: boolean;
    title: string;
    documentName?: string;
    detail?: string;
  };
  activeView?: "documents" | "shared" | "signers" | "signed";
  headerMode?: "documents" | "minimal" | "none";
  onSharedActivityClick?: () => void;
  onSignersClick?: () => void;
  onDocumentsClick?: () => void;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
};

function HrShell({
  children,
  query,
  onQueryChange,
  onUpload,
  actionOverlay,
  activeView,
  headerMode = "documents",
  onSharedActivityClick,
  onSignersClick,
  onDocumentsClick,
  pendingCount,
  inProgressCount,
  completedCount,
}: HrShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  function handleFile(file?: File) {
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Upload a PDF document");
      return;
    }

    onUpload(file);
  }

  function navigate(href: string) {
    router.push(href);
    setMobileOpen(false);
  }

  function showSharedActivity() {
    if (onSharedActivityClick) {
      onSharedActivityClick();
      setMobileOpen(false);
      return;
    }

    navigate("/hr/documents?view=shared");
  }

  return (
    <div className="flex h-svh overflow-hidden bg-[var(--paper)] text-foreground selection:bg-primary selection:text-primary-foreground">
      <div
        data-collapsed={sidebarCollapsed}
        className="hidden w-[240px] shrink-0 transition-[width] duration-300 ease-out data-[collapsed=true]:w-[60px] lg:block motion-reduce:transition-none"
      >
        <HrSidebar
          pathname={pathname}
          activeView={activeView}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          pendingCount={pendingCount}
          inProgressCount={inProgressCount}
          completedCount={completedCount}
          onSharedActivityClick={showSharedActivity}
          onSignersClick={onSignersClick}
          onDocumentsClick={onDocumentsClick}
          onNavigate={navigate}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">SleekSign navigation</SheetTitle>
          <HrSidebar
            pathname={pathname}
            activeView={activeView}
            collapsed={false}
            onCollapsedChange={() => {}}
            pendingCount={pendingCount}
            inProgressCount={inProgressCount}
            completedCount={completedCount}
            onSharedActivityClick={showSharedActivity}
            onSignersClick={onSignersClick}
            onDocumentsClick={onDocumentsClick}
            onNavigate={navigate}
          />
        </SheetContent>
        <main
          className={cn(
            "grid min-w-0 flex-1",
            headerMode === "none"
              ? "grid-rows-[minmax(0,1fr)]"
              : "grid-rows-[auto_minmax(0,1fr)]",
          )}
        >
          {headerMode !== "none" ? (
            <header className="flex min-h-14 items-center gap-2 border-b border-border bg-background px-3 py-2 sm:gap-3 sm:px-6">
              <SheetTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <MenuIcon />
                </Button>
              </SheetTrigger>
              {headerMode === "documents" ? (
                <>
                  <div className="relative min-w-0 flex-1 max-w-2xl">
                    <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(event) => onQueryChange(event.target.value)}
                      placeholder="Search documents and signers..."
                      className="h-8 bg-card pl-9 sm:pr-12"
                    />
                    <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground md:block">
                      ⌘ K
                    </kbd>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(event) => {
                      handleFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    className="ml-auto gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon data-icon="inline-start" />
                    <span className="hidden sm:inline">Upload Document</span>
                  </Button>
                </>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Document Workspace
                  </p>
                </div>
              )}
            </header>
          ) : null}
          {children}
        </main>
      </Sheet>
      <AnimatePresence>
        {actionOverlay?.visible ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-background/55 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-[min(92vw,24rem)] border border-border bg-background px-5 py-4 shadow-sm"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Preparing workspace
              </p>
              <p className="mt-2 text-sm font-medium">{actionOverlay.title}</p>
              {actionOverlay.documentName ? (
                <div className="mt-3 flex min-w-0 items-center gap-3 border border-border bg-card px-3 py-2">
                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.9,
                      ease: "linear",
                      repeat: Infinity,
                    }}
                    className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground"
                  >
                    <LoaderCircleIcon className="size-4" />
                  </motion.span>
                  <span className="min-w-0 truncate text-sm font-medium">
                    {actionOverlay.documentName}
                  </span>
                </div>
              ) : null}
              {actionOverlay.detail ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {actionOverlay.detail}
                </p>
              ) : null}
              <div className="mt-4 h-2 overflow-hidden bg-muted">
                <motion.div
                  className="h-full w-1/2 bg-primary/90"
                  initial={{ x: "-120%" }}
                  animate={{ x: "240%" }}
                  transition={{
                    duration: 1.05,
                    ease: [0.22, 1, 0.36, 1],
                    repeat: Infinity,
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function HrSidebar({
  pathname,
  activeView,
  collapsed,
  onCollapsedChange,
  pendingCount,
  inProgressCount,
  completedCount,
  onSharedActivityClick,
  onSignersClick,
  onDocumentsClick,
  onNavigate,
}: {
  pathname: string;
  activeView?: "documents" | "shared" | "signers" | "signed";
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  onSharedActivityClick: () => void;
  onSignersClick?: () => void;
  onDocumentsClick?: () => void;
  onNavigate: (href: string) => void;
}) {
  const isDocuments = activeView
    ? activeView === "documents"
    : pathname.startsWith("/hr/documents");
  const isShared = activeView === "shared";
  const isSigners = activeView === "signers";
  const isSigned = activeView === "signed" || pathname.startsWith("/hr/signed");

  function showSharedActivity() {
    onSharedActivityClick();
  }

  function showSigners() {
    if (onSignersClick) {
      onSignersClick();
      return;
    }

    onNavigate("/hr/documents?view=signers");
  }

  function showDocuments() {
    if (onDocumentsClick) {
      onDocumentsClick();
      return;
    }

    onNavigate("/hr/documents");
  }

  return (
    <Sidebar
      data-collapsed={collapsed}
      className="h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader
        className={cn(
          "flex h-14 items-center justify-between border-b border-sidebar-border p-4",
          collapsed && "justify-center px-2",
        )}
      >
        {collapsed ? null : (
          <button
            className="flex min-w-0 items-center gap-2 text-left"
            onClick={() => onNavigate("/hr/documents")}
          >
            <span className="truncate text-xl ruthie-regular transition-opacity duration-200">
              SleekSign
            </span>
          </button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden text-muted-foreground transition-colors lg:inline-flex"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && "sr-only")}>
            Workspace
          </SidebarGroupLabel>
          <SidebarMenuButton active={isDocuments} onClick={showDocuments}>
            <LayoutListIcon />
            <span className={cn(collapsed && "sr-only")}>Documents</span>
          </SidebarMenuButton>
          <SidebarMenuButton active={isShared} onClick={showSharedActivity}>
            <Clock3Icon />
            <span className={cn(collapsed && "sr-only")}>Shared Activity</span>
          </SidebarMenuButton>
          <SidebarMenuButton active={isSigners} onClick={showSigners}>
            <UsersIcon />
            <span className={cn(collapsed && "sr-only")}>Signers</span>
          </SidebarMenuButton>
          <SidebarMenuButton
            active={isSigned}
            onClick={() => onNavigate("/hr/signed")}
          >
            <CheckCircle2Icon />
            <span className={cn(collapsed && "sr-only")}>Signed Docs</span>
          </SidebarMenuButton>
        </SidebarGroup>
        <div
          className={cn(
            "mt-4 border border-sidebar-border bg-secondary p-3 transition-opacity duration-200",
            collapsed && "hidden",
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/50">
            Status
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <StatusLine
              icon={Clock3Icon}
              label="Pending"
              value={pendingCount}
            />
            <StatusLine
              icon={FileTextIcon}
              label="In progress"
              value={inProgressCount}
            />
            <StatusLine
              icon={CheckCircle2Icon}
              label="Completed"
              value={completedCount}
            />
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <AccountMenu collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}

function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = React.useState(false);
  const [confirmDeleteWorkspaceOpen, setConfirmDeleteWorkspaceOpen] =
    React.useState(false);
  const [confirmDeleteAccountOpen, setConfirmDeleteAccountOpen] =
    React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [activeRole, setActiveRole] = React.useState<WorkspaceRole>("member");
  const [members, setMembers] = React.useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = React.useState<WorkspaceInvitation[]>(
    [],
  );
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<WorkspaceRole>("member");
  const [workspaceDataLoading, setWorkspaceDataLoading] = React.useState(false);
  const [workspaceBusy, setWorkspaceBusy] = React.useState<
    "" | "creating" | "renaming" | "deleting"
  >("");
  const [memberBusyId, setMemberBusyId] = React.useState("");
  const [invitationBusyId, setInvitationBusyId] = React.useState("");
  const [workspaceTransitionVisible, setWorkspaceTransitionVisible] =
    React.useState(false);
  const [optimisticWorkspaceNames, setOptimisticWorkspaceNames] =
    React.useState<Record<string, { name: string; slug: string }>>({});
  const [optimisticDeletedWorkspaceIds, setOptimisticDeletedWorkspaceIds] =
    React.useState<string[]>([]);
  const [optimisticCreatedWorkspaces, setOptimisticCreatedWorkspaces] =
    React.useState<WorkspaceSummary[]>([]);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: authOrganizations } = authClient.useListOrganizations();
  const selectedWorkspaceId = useCurrentWorkspaceId();
  const workspaces = React.useMemo(
    () => (Array.isArray(authOrganizations) ? authOrganizations : []),
    [authOrganizations],
  );
  const workspaceItems = React.useMemo(() => {
    const deletedIds = new Set(optimisticDeletedWorkspaceIds);
    const base = workspaces
      .filter((item) => !deletedIds.has(item.id))
      .map((item) => {
        const optimistic = optimisticWorkspaceNames[item.id];
        return optimistic ? { ...item, ...optimistic } : item;
      });
    const existingIds = new Set(base.map((item) => item.id));
    const created = optimisticCreatedWorkspaces.filter(
      (item) => !deletedIds.has(item.id) && !existingIds.has(item.id),
    );

    return [...base, ...created];
  }, [
    optimisticCreatedWorkspaces,
    optimisticDeletedWorkspaceIds,
    optimisticWorkspaceNames,
    workspaces,
  ]);
  const activeWorkspace =
    workspaceItems.find((item) => item.id === selectedWorkspaceId) || null;
  const user = session?.user;
  const userName = user?.name || "Signed in user";
  const userEmail = user?.email || "No email";
  const userInitials = getInitials(userName);
  const canManageWorkspace = activeRole === "owner" || activeRole === "admin";
  const canDeleteWorkspace = activeRole === "owner";
  const inviteRoleOptions = canDeleteWorkspace
    ? ["member", "admin", "owner"]
    : ["member", "admin"];

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setWorkspaceOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  async function loadWorkspaceData(workspaceId: string) {
    setWorkspaceDataLoading(true);

    try {
      const data = await loadWorkspaceAccessSnapshot(workspaceId);
      setActiveRole(data.role);
      setMembers(data.members);
      setInvitations(data.invitations);
    } catch {
      setActiveRole("member");
      setMembers([]);
      setInvitations([]);
      toast.error("Unable to load workspace access details");
    } finally {
      setWorkspaceDataLoading(false);
    }
  }

  React.useEffect(() => {
    if (!settingsOpen || !selectedWorkspaceId) return;

    let cancelled = false;

    async function syncWorkspaceData() {
      setWorkspaceDataLoading(true);

      try {
        const data = await loadWorkspaceAccessSnapshot(selectedWorkspaceId);
        if (cancelled) return;
        setActiveRole(data.role);
        setMembers(data.members);
        setInvitations(data.invitations);
      } catch {
        if (cancelled) return;
        setActiveRole("member");
        setMembers([]);
        setInvitations([]);
        toast.error("Unable to load workspace access details");
      } finally {
        if (!cancelled) {
          setWorkspaceDataLoading(false);
        }
      }
    }

    syncWorkspaceData().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId, settingsOpen]);

  async function playWorkspaceTransition(task: () => Promise<void> | void) {
    setWorkspaceTransitionVisible(true);
    setOpen(false);
    setWorkspaceOpen(false);

    await new Promise((resolve) => window.setTimeout(resolve, 40));

    try {
      await task();
      router.refresh();
    } finally {
      window.setTimeout(() => {
        setWorkspaceTransitionVisible(false);
      }, 980);
    }
  }

  async function switchWorkspace(nextWorkspaceId: string) {
    await playWorkspaceTransition(async () => {
      setCurrentWorkspaceId(nextWorkspaceId);
      await authClient
        .$fetch("/organization/set-active", {
          method: "POST",
          body: { organizationId: nextWorkspaceId },
        })
        .catch(() => undefined);
    });
  }

  async function createWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) return;

    try {
      setWorkspaceBusy("creating");
      const organization = await authClient.organization.create({
        name,
        slug: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      });
      if (organization?.data?.id) {
        setOptimisticCreatedWorkspaces((current) => [
          ...current,
          {
            id: organization.data.id,
            name: organization.data.name,
            slug: organization.data.slug,
          },
        ]);
        await switchWorkspace(organization.data.id);
      }
      toast.success("Workspace created");
    } catch {
      toast.error("Sign in before creating a workspace");
    } finally {
      setWorkspaceBusy("");
    }

    setNewWorkspaceName("");
  }

  async function deleteWorkspace(workspaceId: string) {
    const currentWorkspace = workspaceItems.find(
      (item) => item.id === workspaceId,
    );
    const fallbackWorkspace =
      workspaceItems.find((item) => item.id !== workspaceId)?.id || "";

    try {
      setWorkspaceBusy("deleting");
      setOptimisticDeletedWorkspaceIds((current) => [
        ...new Set([...current, workspaceId]),
      ]);
      await authClient.$fetch("/organization/delete", {
        method: "POST",
        body: { organizationId: workspaceId },
      });
      if (workspaceId === selectedWorkspaceId) {
        setCurrentWorkspaceId(fallbackWorkspace);
        if (fallbackWorkspace) {
          await switchWorkspace(fallbackWorkspace);
        }
      }
      setConfirmDeleteWorkspaceOpen(false);
      setSettingsOpen(Boolean(fallbackWorkspace));
      toast.success("Workspace deleted");
    } catch {
      if (currentWorkspace) {
        setOptimisticDeletedWorkspaceIds((current) =>
          current.filter((item) => item !== currentWorkspace.id),
        );
      }
      toast.error("Unable to delete workspace");
    } finally {
      setWorkspaceBusy("");
    }
  }

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const image = String(formData.get("image") || "").trim();

    try {
      await authClient.updateUser({
        name,
        image: image || null,
      });
      toast.success("Profile updated");
    } catch {
      toast.error("Unable to update profile");
    }
  }

  async function renameWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("workspaceName") || "").trim();
    if (!selectedWorkspaceId || !name || !activeWorkspace) return;

    try {
      setWorkspaceBusy("renaming");
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setOptimisticWorkspaceNames((current) => ({
        ...current,
        [selectedWorkspaceId]: { name, slug },
      }));
      await authClient.$fetch("/organization/update", {
        method: "POST",
        body: {
          organizationId: selectedWorkspaceId,
          data: {
            name,
            slug,
          },
        },
      });
      router.refresh();
      toast.success("Workspace renamed");
    } catch {
      setOptimisticWorkspaceNames((current) => {
        const next = { ...current };
        delete next[selectedWorkspaceId];
        return next;
      });
      toast.error("Unable to rename workspace");
    } finally {
      setWorkspaceBusy("");
    }
  }

  async function deleteAccount() {
    try {
      await authClient.deleteUser({
        callbackURL: "/signin",
      });
      setConfirmDeleteAccountOpen(false);
      setSettingsOpen(false);
      setCurrentWorkspaceId("");
      router.push("/signin");
    } catch {
      toast.error("Unable to delete account");
    }
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWorkspaceId || !inviteEmail.trim()) return;

    try {
      await authClient.$fetch("/organization/invite-member", {
        method: "POST",
        body: {
          email: inviteEmail.trim(),
          role: inviteRole,
          organizationId: selectedWorkspaceId,
        },
      });
      setInviteEmail("");
      setInviteRole("member");
      await loadWorkspaceData(selectedWorkspaceId);
      toast.success("Invitation sent");
    } catch {
      toast.error("Unable to invite this member");
    }
  }

  async function cancelInvitation(invitationId: string) {
    if (!selectedWorkspaceId) return;

    const snapshot = invitations;

    try {
      setInvitationBusyId(invitationId);
      setInvitations((current) =>
        current.filter((item) => item.id !== invitationId),
      );
      await authClient.$fetch("/organization/cancel-invitation", {
        method: "POST",
        body: { invitationId },
      });
      toast.success("Invitation cancelled");
    } catch {
      setInvitations(snapshot);
      toast.error("Unable to cancel invitation");
    } finally {
      setInvitationBusyId("");
    }
  }

  async function updateMemberRole(
    member: WorkspaceMember,
    role: WorkspaceRole,
  ) {
    if (!selectedWorkspaceId) return;
    const snapshot = members;

    try {
      setMemberBusyId(member.id);
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id ? { ...item, role } : item,
        ),
      );
      await authClient.$fetch("/organization/update-member-role", {
        method: "POST",
        body: {
          memberId: member.id,
          role,
          organizationId: selectedWorkspaceId,
        },
      });
      if (member.userId === user?.id) {
        setActiveRole(role);
      }
      toast.success(
        role === "owner" ? "Ownership transferred" : "Member role updated",
      );
      await loadWorkspaceData(selectedWorkspaceId);
    } catch {
      setMembers(snapshot);
      toast.error("Unable to update role");
    } finally {
      setMemberBusyId("");
    }
  }

  async function removeMember(member: WorkspaceMember) {
    if (!selectedWorkspaceId) return;
    const snapshot = members;

    try {
      setMemberBusyId(member.id);
      setMembers((current) => current.filter((item) => item.id !== member.id));
      await authClient.$fetch("/organization/remove-member", {
        method: "POST",
        body: {
          memberIdOrEmail: member.id,
          organizationId: selectedWorkspaceId,
        },
      });
      toast.success("Member removed");
    } catch {
      setMembers(snapshot);
      toast.error("Unable to remove member");
    } finally {
      setMemberBusyId("");
    }
  }

  function canManageMember(member: WorkspaceMember) {
    if (member.userId === user?.id) return false;
    if (activeRole === "owner") return true;
    if (activeRole === "admin") return member.role === "member";
    return false;
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        className="flex w-full items-center gap-3 px-1 text-left transition-colors hover:text-foreground"
        onClick={() => {
          setOpen((current) => !current);
          setWorkspaceOpen(false);
        }}
        aria-expanded={open}
      >
        <Avatar className="size-8 rounded-none">
          <AvatarFallback className="rounded-none bg-sidebar-primary font-mono text-[10px] text-sidebar-primary-foreground">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className={cn("min-w-0", collapsed && "hidden")}>
          <p className="truncate text-xs font-medium">{userName}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
            {activeWorkspace?.name || "No workspace"}
          </p>
        </div>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-[calc(100%+0.75rem)] left-0 z-50 w-64 origin-bottom-left border border-border bg-popover p-2 shadow-sm"
          >
            <div className="border-b border-border px-2 py-2">
              <p className="text-xs font-medium">{userName}</p>
              <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {userEmail}
              </p>
            </div>

            <button
              className="mt-2 flex h-8 w-full items-center gap-2 border-b border-border px-2 pb-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setWorkspaceOpen((current) => !current)}
              aria-expanded={workspaceOpen}
            >
              <Building2Icon className="size-3.5" />
              <span className="min-w-0 flex-1 truncate">Workspace</span>
              <ChevronRightIcon className="size-3.5" />
            </button>

            <ThemeToggle
              showLabel
              className="mt-1 h-8 w-full justify-start border-0 px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            />
            <button
              className="flex h-8 w-full items-center gap-2 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon className="size-3.5" />
              Settings
            </button>
            <button
              className="mt-1 flex h-8 w-full items-center gap-2 border-t border-border px-2 pt-2 text-left font-mono text-[10px] uppercase tracking-widest text-red-300 transition-colors hover:bg-red-500/10"
              onClick={() => setConfirmSignOutOpen(true)}
            >
              Sign Out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open && workspaceOpen ? (
          <WorkspacePopover
            activeWorkspaceId={selectedWorkspaceId}
            workspaces={workspaceItems}
            newWorkspaceName={newWorkspaceName}
            onNewWorkspaceNameChange={setNewWorkspaceName}
            onCreateWorkspace={createWorkspace}
            onSelectWorkspace={switchWorkspace}
            creating={workspaceBusy === "creating"}
          />
        ) : null}
      </AnimatePresence>

      <Dialog open={confirmSignOutOpen} onOpenChange={setConfirmSignOutOpen}>
        <DialogContent className="rounded-none border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              Sign out?
            </DialogTitle>
            <DialogDescription>
              You will return to the sign in page. Unsaved document edits should
              be saved before leaving.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="rounded-none border-border">
            <Button
              variant="outline"
              onClick={() => setConfirmSignOutOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setConfirmSignOutOpen(false);
                setOpen(false);
                setWorkspaceOpen(false);
                setCurrentWorkspaceId("");
                await authClient.signOut().catch(() => undefined);
                router.push("/signin");
              }}
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteAccountOpen}
        onOpenChange={setConfirmDeleteAccountOpen}
      >
        <DialogContent className="rounded-none border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              Delete account?
            </DialogTitle>
            <DialogDescription>
              This permanently removes your SleekSign account. Workspace
              documents may remain until workspace owners remove them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="rounded-none border-border">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteAccountOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteAccount}>
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteWorkspaceOpen}
        onOpenChange={setConfirmDeleteWorkspaceOpen}
      >
        <DialogContent className="rounded-none border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              Delete workspace?
            </DialogTitle>
            <DialogDescription>
              This removes {activeWorkspace?.name || "this workspace"} and its
              team access from your workspace list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="rounded-none border-border">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteWorkspaceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!selectedWorkspaceId || workspaceBusy === "deleting"}
              onClick={() =>
                selectedWorkspaceId && deleteWorkspace(selectedWorkspaceId)
              }
            >
              Delete Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="rounded-none border-border bg-popover p-0 shadow-sm sm:max-w-3xl">
          <div className="grid max-h-[82vh] overflow-hidden sm:grid-cols-[220px_minmax(0,1fr)]">
            <div className="border-b border-border bg-secondary p-5 sm:border-b-0 sm:border-r">
              <DialogHeader>
                <DialogTitle className="font-mono text-xs uppercase tracking-widest">
                  Settings
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Manage your profile, workspace, and interface preferences.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 flex items-center gap-3">
                <Avatar className="size-9 rounded-none">
                  <AvatarFallback className="rounded-none bg-sidebar-primary font-mono text-[10px] text-sidebar-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {userEmail}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-auto p-5">
              <section className="border border-border bg-background p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  User Profile
                </p>
                <form className="mt-3 grid gap-3" onSubmit={updateProfile}>
                  <label className="grid gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Name
                    </span>
                    <Input
                      name="name"
                      defaultValue={user?.name || ""}
                      placeholder="Your name"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Avatar URL
                    </span>
                    <Input
                      name="image"
                      defaultValue={user?.image || ""}
                      placeholder="https://..."
                    />
                  </label>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-muted-foreground">
                      {userEmail}
                    </p>
                    <Button type="submit" size="sm">
                      Save Profile
                    </Button>
                  </div>
                </form>
              </section>

              <section className="border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Appearance
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Keep the workspace comfortable for review sessions.
                    </p>
                  </div>
                  <ThemeToggle showLabel className="justify-start" />
                </div>
              </section>

              <section className="mt-4 border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Workspace Management
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The active workspace controls which documents, members,
                      and invitations you can manage.
                    </p>
                  </div>
                  {activeWorkspace ? (
                    <Badge variant="outline">{activeRole}</Badge>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2">
                  {workspaceItems.length === 0 ? (
                    <div className="border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No workspaces yet. Create one from the account workspace
                      menu.
                    </div>
                  ) : (
                    workspaceItems.map((item) => (
                      <button
                        key={item.id}
                        className={cn(
                          "flex items-center gap-2 border border-border px-3 py-2 text-left transition-colors hover:bg-muted/60",
                          item.id === selectedWorkspaceId && "bg-secondary",
                        )}
                        onClick={() => {
                          void switchWorkspace(item.id);
                        }}
                      >
                        <Building2Icon className="size-3.5 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.name}
                          </p>
                          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            {item.slug}
                          </p>
                        </div>
                        {item.id === selectedWorkspaceId ? (
                          <CheckIcon className="size-3.5 text-emerald-400" />
                        ) : null}
                      </button>
                    ))
                  )}
                </div>

                {activeWorkspace ? (
                  <form
                    className="mt-4 grid gap-3 border border-border bg-secondary p-3"
                    onSubmit={renameWorkspace}
                  >
                    <label className="grid gap-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Active Workspace
                      </span>
                      <Input
                        key={selectedWorkspaceId}
                        name="workspaceName"
                        defaultValue={activeWorkspace.name}
                        placeholder="Workspace name"
                        disabled={
                          !canManageWorkspace || workspaceBusy === "renaming"
                        }
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {canManageWorkspace
                          ? "Owners and admins can rename this workspace."
                          : "Only owners and admins can rename this workspace."}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={
                            !canManageWorkspace || workspaceBusy === "renaming"
                          }
                        >
                          Save Workspace
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canDeleteWorkspace}
                          onClick={() => setConfirmDeleteWorkspaceOpen(true)}
                        >
                          Delete Workspace
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : null}
              </section>

              <section className="mt-4 border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Workspace Members
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Owners can transfer ownership. Admins can manage members.
                      Members can review access.
                    </p>
                  </div>
                  {workspaceDataLoading ? (
                    <Badge variant="secondary">Syncing</Badge>
                  ) : null}
                </div>

                <form
                  className="mt-3 grid gap-2 border border-border bg-secondary p-3 sm:grid-cols-[minmax(0,1fr)_120px_auto]"
                  onSubmit={inviteMember}
                >
                  <Input
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="Invite by email"
                    disabled={!canManageWorkspace || !selectedWorkspaceId}
                  />
                  <Select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                    disabled={!canManageWorkspace || !selectedWorkspaceId}
                  >
                    {inviteRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="submit"
                    disabled={!canManageWorkspace || !selectedWorkspaceId}
                  >
                    Invite
                  </Button>
                </form>

                <div className="mt-3 grid gap-2">
                  {members.length === 0 ? (
                    <div className="border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No workspace members yet.
                    </div>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="grid gap-3 border border-border px-3 py-3 sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {member.user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="justify-center">
                          {member.role}
                        </Badge>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {canManageMember(member) ? (
                            <>
                              <Select
                                className="w-[112px]"
                                value={member.role}
                                disabled={memberBusyId === member.id}
                                onChange={(event) =>
                                  updateMemberRole(member, event.target.value)
                                }
                              >
                                <option value="member">member</option>
                                <option value="admin">admin</option>
                                {canDeleteWorkspace ? (
                                  <option value="owner">owner</option>
                                ) : null}
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
                                disabled={memberBusyId === member.id}
                                onClick={() => removeMember(member)}
                              >
                                Remove
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {member.userId === user?.id ? "You" : "Read only"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="mt-4 border border-border bg-background p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Pending Invitations
                </p>
                <div className="mt-3 grid gap-2">
                  {invitations.length === 0 ? (
                    <div className="border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No pending invitations for this workspace.
                    </div>
                  ) : (
                    invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="grid gap-2 border border-border px-3 py-3 sm:grid-cols-[minmax(0,1fr)_100px_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {invitation.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Status: {invitation.status}
                          </p>
                        </div>
                        <Badge variant="outline" className="justify-center">
                          {invitation.role}
                        </Badge>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={
                              !canManageWorkspace ||
                              invitationBusyId === invitation.id
                            }
                            onClick={() => cancelInvitation(invitation.id)}
                          >
                            Cancel Invite
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="mt-4 border border-red-500/30 bg-red-500/5 p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-red-300">
                  Danger Zone
                </p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Delete your account and end your current session.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDeleteAccountOpen(true)}
                  >
                    Delete Account
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {workspaceTransitionVisible ? <WorkspaceTransitionOverlay /> : null}
      </AnimatePresence>
    </div>
  );
}

function WorkspaceTransitionOverlay() {
  const segments = Array.from({ length: 6 }, (_, index) => index);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="go flex h-full flex-col">
        {segments.map((segment) => (
          <div key={segment} className="blind-slat flex-1" />
        ))}
      </div>
    </div>
  );
}

function WorkspacePopover({
  activeWorkspaceId,
  workspaces,
  newWorkspaceName,
  onNewWorkspaceNameChange,
  onCreateWorkspace,
  onSelectWorkspace,
  creating,
}: {
  activeWorkspaceId: string;
  workspaces: Array<{ id: string; name: string; slug: string }>;
  newWorkspaceName: string;
  onNewWorkspaceNameChange: (value: string) => void;
  onCreateWorkspace: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  creating: boolean;
}) {
  const activeWorkspace = workspaces.find(
    (item) => item.id === activeWorkspaceId,
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -8, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="absolute bottom-[calc(100%+0.75rem)] left-[calc(100%+0.5rem)] z-50 w-72 origin-bottom-left border border-border bg-popover p-2 shadow-sm"
    >
      <div className="border-b border-border px-2 py-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest">
          Switch workspace
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {activeWorkspace?.name || "No workspace selected"}
        </p>
      </div>

      <div className="max-h-52 overflow-auto py-2">
        {workspaces.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground">
            No workspaces yet.
          </div>
        ) : (
          workspaces.map((item) => (
            <button
              key={item.id}
              className="flex h-9 w-full items-center gap-2 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => onSelectWorkspace(item.id)}
            >
              <Building2Icon className="size-3.5" />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {activeWorkspaceId === item.id ? (
                <CheckIcon className="size-3.5 text-emerald-400" />
              ) : null}
            </button>
          ))
        )}
      </div>

      <form
        className="grid gap-2 border-t border-border pt-2"
        onSubmit={onCreateWorkspace}
      >
        <Input
          value={newWorkspaceName}
          onChange={(event) => onNewWorkspaceNameChange(event.target.value)}
          placeholder="New workspace"
          className="h-8"
        />
        <Button
          size="sm"
          className="justify-start gap-2"
          type="submit"
          disabled={creating}
        >
          <PlusIcon data-icon="inline-start" />
          Create Workspace
        </Button>
      </form>
    </motion.div>
  );
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function StatusLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sidebar-foreground/75">
      <Icon className="size-3.5" />
      <span className="text-xs">{label}</span>
      <span className="ml-auto font-mono text-xs text-sidebar-foreground/55">
        {value}
      </span>
    </div>
  );
}

export { HrShell };
