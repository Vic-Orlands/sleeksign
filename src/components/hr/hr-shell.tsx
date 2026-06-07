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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { saveLastWorkspaceId } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  setCurrentTeamId,
  setCurrentWorkspaceId,
  useCurrentTeamId,
  useCurrentWorkspaceId,
} from "@/lib/workspace-store";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

type TeamSummary = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isDefault?: boolean;
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
    progress?: number;
  };
  activeView?: "documents" | "shared" | "signers" | "signed" | "admin";
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
                Document upload
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
                    className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground rounded-full"
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
              <div className="mt-4 h-2.5 overflow-hidden bg-muted rounded-lg">
                <motion.div
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.max(2, Math.min(100, actionOverlay.progress ?? 8))}%`,
                  }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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
  activeView?: "documents" | "shared" | "signers" | "signed" | "admin";
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
  const isSigners =
    activeView === "signers" || pathname.startsWith("/hr/signers");
  const isSigned = activeView === "signed" || pathname.startsWith("/hr/signed");

  function showSharedActivity() {
    onSharedActivityClick();
  }

  function showSigners() {
    if (onSignersClick) {
      onSignersClick();
      return;
    }

    onNavigate("/hr/signers");
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
            <span className="truncate text-xl font-cursive transition-opacity duration-200">
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
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = React.useState(false);
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = React.useState(false);
  const [signOutBusy, setSignOutBusy] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [newTeamName, setNewTeamName] = React.useState("");
  const [workspaceBusy, setWorkspaceBusy] = React.useState<"" | "creating">("");
  const [teamBusy, setTeamBusy] = React.useState(false);
  const [workspaceTransitionVisible, setWorkspaceTransitionVisible] =
    React.useState(false);
  const [optimisticWorkspaceNames] = React.useState<
    Record<string, { name: string; slug: string }>
  >({});
  const [optimisticDeletedWorkspaceIds] = React.useState<string[]>([]);
  const [optimisticCreatedWorkspaces, setOptimisticCreatedWorkspaces] =
    React.useState<WorkspaceSummary[]>([]);
  const [workspaceForTeams, setWorkspaceForTeams] = React.useState("");
  const [workspaceTeams, setWorkspaceTeams] = React.useState<TeamSummary[]>([]);
  const [workspaceTeamsById, setWorkspaceTeamsById] = React.useState<
    Record<string, TeamSummary[]>
  >({});
  const [teamsLoading, setTeamsLoading] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: authOrganizations } = authClient.useListOrganizations();
  const selectedWorkspaceId = useCurrentWorkspaceId();
  const selectedTeamId = useCurrentTeamId();
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
  const sessionWorkspaceId =
    getSessionWorkspaceId(session) ||
    getLastWorkspaceId(user) ||
    workspaces[0]?.id ||
    "";
  const viewedWorkspaceId = workspaceForTeams || selectedWorkspaceId;
  const viewedWorkspace =
    workspaceItems.find((item) => item.id === viewedWorkspaceId) || null;

  React.useEffect(() => {
    if (!sessionWorkspaceId) return;
    if (selectedWorkspaceId === sessionWorkspaceId) return;

    const selectedWorkspaceIsKnown = workspaceItems.some(
      (workspace) => workspace.id === selectedWorkspaceId,
    );
    if (selectedWorkspaceIsKnown) return;

    setCurrentWorkspaceId(sessionWorkspaceId);
  }, [selectedWorkspaceId, sessionWorkspaceId, workspaceItems]);

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

  function sortTeams(teams: TeamSummary[]) {
    return [...teams].sort((left, right) => {
      if (left.isDefault) return -1;
      if (right.isDefault) return 1;
      return left.name.localeCompare(right.name);
    });
  }

  async function loadWorkspaceTeams(
    workspaceId: string,
    options?: { force?: boolean },
  ) {
    const cachedTeams = workspaceTeamsById[workspaceId];
    if (cachedTeams && !options?.force) {
      setWorkspaceTeams(cachedTeams);
      return cachedTeams;
    }

    setTeamsLoading(true);
    try {
      const data = await fetchWorkspaceRequest<{ teams?: TeamSummary[] }>(
        `/api/teams?workspaceId=${encodeURIComponent(workspaceId)}&summary=1`,
      );
      const teams = sortTeams(Array.isArray(data.teams) ? data.teams : []);
      setWorkspaceTeams(teams);
      setWorkspaceTeamsById((current) => ({
        ...current,
        [workspaceId]: teams,
      }));
      return teams;
    } catch {
      toast.error("Unable to load teams");
      setWorkspaceTeams([]);
      return [];
    } finally {
      setTeamsLoading(false);
    }
  }

  async function switchWorkspace(nextWorkspaceId: string, nextTeamId?: string) {
    await playWorkspaceTransition(async () => {
      setCurrentWorkspaceId(nextWorkspaceId);
      await Promise.allSettled([
        authClient.$fetch("/organization/set-active", {
          method: "POST",
          body: { organizationId: nextWorkspaceId },
        }),
        saveLastWorkspaceId(nextWorkspaceId),
      ]);

      let resolvedTeamId = nextTeamId;
      if (!resolvedTeamId) {
        const data = await fetchWorkspaceRequest<{ teams?: TeamSummary[] }>(
          `/api/teams?workspaceId=${encodeURIComponent(nextWorkspaceId)}&summary=1`,
        );
        const teams = sortTeams(Array.isArray(data.teams) ? data.teams : []);
        setWorkspaceTeamsById((current) => ({
          ...current,
          [nextWorkspaceId]: teams,
        }));
        resolvedTeamId =
          teams.find((team) => team.isDefault)?.id || teams[0]?.id || "";
      }
      setCurrentTeamId(resolvedTeamId || "");
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
        const createdTeams = await loadWorkspaceTeams(organization.data.id);
        const defaultTeamId =
          createdTeams.find((team) => team.isDefault)?.id ||
          createdTeams[0]?.id;
        await switchWorkspace(organization.data.id, defaultTeamId);
        setWorkspaceForTeams(organization.data.id);
      }
      toast.success("Workspace created");
      setCreateWorkspaceOpen(false);
    } catch {
      toast.error("Sign in before creating a workspace");
    } finally {
      setWorkspaceBusy("");
    }

    setNewWorkspaceName("");
  }

  async function handleWorkspaceClick(workspaceId: string) {
    setWorkspaceForTeams(workspaceId);
    void loadWorkspaceTeams(workspaceId);
  }

  async function createTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newTeamName.trim();
    if (!viewedWorkspaceId || !name) return;

    try {
      setTeamBusy(true);
      const response = await fetch("/api/teams", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: viewedWorkspaceId,
          name,
        }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to create team");
      }

      const teams = await loadWorkspaceTeams(viewedWorkspaceId, {
        force: true,
      });
      const createdTeamId =
        data.id || teams.find((team) => team.name === name)?.id;
      if (createdTeamId) {
        await switchWorkspace(viewedWorkspaceId, createdTeamId);
      }
      setNewTeamName("");
      toast.success("Team created");
      setCreateTeamOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create team",
      );
    } finally {
      setTeamBusy(false);
    }
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
          <AvatarImage
            src={user?.image || undefined}
            alt={userName}
            className="rounded-none"
          />
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

            <div className="mt-2 border-b border-border pb-2">
              <p className="px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Workspaces
              </p>
              <div className="mt-2 flex max-h-44 flex-col overflow-auto">
                {workspaceItems.map((item) => (
                  <button
                    key={item.id}
                    className={cn(
                      "flex h-8 w-full items-center gap-2 px-2 text-left font-mono text-[10px] uppercase tracking-widest transition-colors hover:bg-muted hover:text-foreground",
                      item.id === selectedWorkspaceId
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                    onClick={() => {
                      setWorkspaceOpen(true);
                      void handleWorkspaceClick(item.id);
                    }}
                  >
                    <Building2Icon className="size-3.5" />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.id === selectedWorkspaceId ? (
                      <CheckIcon className="size-3.5 text-emerald-400" />
                    ) : null}
                    <ChevronRightIcon className="size-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              className="mt-2 w-full justify-start gap-2"
              type="button"
              onClick={() => setCreateWorkspaceOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Create Workspace
            </Button>

            <ThemeToggle
              showLabel
              className="mt-2 h-8 w-full justify-start border-0 px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            />
            <button
              className="flex h-8 w-full items-center gap-2 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                setOpen(false);
                setWorkspaceOpen(false);
                router.push("/hr/settings");
              }}
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
        {open && workspaceOpen && viewedWorkspace ? (
          <TeamPopover
            workspace={viewedWorkspace}
            teams={workspaceTeams}
            selectedTeamId={
              selectedWorkspaceId === viewedWorkspace.id ? selectedTeamId : ""
            }
            loading={teamsLoading}
            onCreateTeamClick={() => setCreateTeamOpen(true)}
            onSelectTeam={(teamId) =>
              switchWorkspace(viewedWorkspace.id, teamId)
            }
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
              loading={signOutBusy}
              loadingText="Signing out..."
              onClick={async () => {
                setSignOutBusy(true);
                try {
                  setOpen(false);
                  setWorkspaceOpen(false);
                  setCurrentWorkspaceId("");
                  await authClient.signOut().catch(() => undefined);
                  router.push("/signin");
                } finally {
                  setSignOutBusy(false);
                  setConfirmSignOutOpen(false);
                }
              }}
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen}>
        <DialogContent className="rounded-none border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              Create workspace
            </DialogTitle>
            <DialogDescription>
              Start a new workspace and provision its default General team.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={createWorkspace}>
            <Input
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder="Workspace name"
              className="h-9"
            />
            <DialogFooter className="rounded-none border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateWorkspaceOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={workspaceBusy === "creating"}>
                {workspaceBusy === "creating"
                  ? "Creating..."
                  : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent className="rounded-none border-border bg-popover shadow-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              Create team
            </DialogTitle>
            <DialogDescription>
              Add a team inside {viewedWorkspace?.name || "this workspace"}.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={createTeam}>
            <Input
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
              placeholder="Team name"
              className="h-9"
            />
            <DialogFooter className="rounded-none border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateTeamOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={teamBusy}>
                {teamBusy ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
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

function TeamPopover({
  workspace,
  teams,
  selectedTeamId,
  loading,
  onCreateTeamClick,
  onSelectTeam,
}: {
  workspace: WorkspaceSummary;
  teams: TeamSummary[];
  selectedTeamId: string;
  loading: boolean;
  onCreateTeamClick: () => void;
  onSelectTeam: (teamId: string) => void;
}) {
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
          Teams
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{workspace.name}</p>
      </div>

      <div className="max-h-52 overflow-auto py-2">
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground">
            No teams yet.
          </div>
        ) : (
          teams.map((team) => (
            <button
              key={team.id}
              className="flex h-9 w-full items-center gap-2 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => onSelectTeam(team.id)}
            >
              <UsersIcon className="size-3.5" />
              <span className="min-w-0 flex-1 truncate">{team.name}</span>
              {selectedTeamId === team.id ? (
                <CheckIcon className="size-3.5 text-emerald-400" />
              ) : null}
            </button>
          ))
        )}
      </div>

      <div className="border-t border-border pt-2">
        <Button
          size="sm"
          className="w-full justify-start gap-2"
          type="button"
          onClick={onCreateTeamClick}
        >
          <PlusIcon data-icon="inline-start" />
          Create Team
        </Button>
      </div>
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

function getLastWorkspaceId(user: unknown) {
  if (!user || typeof user !== "object") return "";
  const value = (user as { lastWorkspaceId?: unknown }).lastWorkspaceId;
  return typeof value === "string" ? value : "";
}

function getSessionWorkspaceId(session: unknown) {
  if (!session || typeof session !== "object") return "";
  const value = (session as { session?: { activeOrganizationId?: unknown } })
    .session?.activeOrganizationId;
  return typeof value === "string" ? value : "";
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
