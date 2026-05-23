"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, Building2Icon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient, saveLastWorkspaceId } from "@/lib/auth-client";
import { setCurrentWorkspaceId } from "@/lib/workspace-store";

type WorkspaceSelectorProps = {
  nextPath?: string;
};

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

function WorkspaceSelector({ nextPath }: WorkspaceSelectorProps) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: authOrganizations } = authClient.useListOrganizations();
  const workspaces = React.useMemo(
    () => (Array.isArray(authOrganizations) ? authOrganizations : []),
    [authOrganizations],
  );
  const [showFallbackDialog, setShowFallbackDialog] = React.useState(false);
  const [busyWorkspaceId, setBusyWorkspaceId] = React.useState("");
  const [isContinuingWithoutWorkspace, setIsContinuingWithoutWorkspace] =
    React.useState(false);
  const handledAutoSelectionRef = React.useRef(false);

  const lastWorkspaceId = getLastWorkspaceId(session?.user);
  const preferredWorkspace = React.useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === lastWorkspaceId) || null,
    [lastWorkspaceId, workspaces],
  );
  const dialogOpen =
    showFallbackDialog ||
    Boolean(session && authOrganizations && !preferredWorkspace);

  const runAutoSelection = React.useEffectEvent((workspaceId: string) => {
    void selectWorkspace(workspaceId, false);
  });

  React.useEffect(() => {
    if (sessionPending) return;
    if (!session) {
      router.replace(appendNextPath("/signin", nextPath));
      return;
    }
    if (!authOrganizations) return;
    if (handledAutoSelectionRef.current) return;

    if (preferredWorkspace) {
      handledAutoSelectionRef.current = true;
      runAutoSelection(preferredWorkspace.id);
    }
  }, [
    authOrganizations,
    nextPath,
    preferredWorkspace,
    session,
    sessionPending,
    router,
  ]);

  async function selectWorkspace(
    workspaceId: string,
    shouldPersistSelection: boolean,
  ) {
    try {
      setBusyWorkspaceId(workspaceId);
      setCurrentWorkspaceId(workspaceId);
      await authClient.$fetch("/organization/set-active", {
        method: "POST",
        body: { organizationId: workspaceId },
      });
      if (shouldPersistSelection || workspaceId !== lastWorkspaceId) {
        await saveLastWorkspaceId(workspaceId);
      }
      router.replace(nextPath || "/hr/documents");
    } catch {
      toast.error("Unable to open that workspace");
      setBusyWorkspaceId("");
      handledAutoSelectionRef.current = false;
      setShowFallbackDialog(true);
    }
  }

  async function continueWithoutWorkspace() {
    try {
      setIsContinuingWithoutWorkspace(true);
      await saveLastWorkspaceId(null);
      router.replace(nextPath || "/hr/documents");
    } catch {
      toast.error("Unable to continue right now");
      setIsContinuingWithoutWorkspace(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--paper)] px-4 py-8">
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (busyWorkspaceId || isContinuingWithoutWorkspace) return;
          setShowFallbackDialog(open);
        }}
      >
        <DialogContent showCloseButton={false} className="max-w-lg p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Workspace Access
            </p>
            <DialogTitle>Choose the workspace you want to open</DialogTitle>
            <DialogDescription>
              We&apos;ll remember this workspace and log you into it
              automatically the next time you sign in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-5 py-4">
            {workspaces.length === 0 ? (
              <div className="space-y-3 border border-dashed border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 items-center justify-center border border-border bg-muted">
                    <Building2Icon className="size-4" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      No workspaces yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your account signed in successfully. Continue to your
                      dashboard and create a workspace from the account menu.
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={continueWithoutWorkspace}
                  disabled={isContinuingWithoutWorkspace}
                >
                  {isContinuingWithoutWorkspace ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : null}
                  Continue
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </div>
            ) : (
              workspaces.map((workspace) => (
                <WorkspaceOption
                  key={workspace.id}
                  workspace={workspace}
                  isBusy={busyWorkspaceId === workspace.id}
                  onSelect={() => selectWorkspace(workspace.id, true)}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!dialogOpen ? (
        <div className="flex items-center gap-3 border border-border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <LoaderCircleIcon className="size-4 animate-spin text-foreground" />
          Preparing your workspace access...
        </div>
      ) : null}
    </main>
  );
}

function WorkspaceOption({
  workspace,
  isBusy,
  onSelect,
}: {
  workspace: WorkspaceSummary;
  isBusy: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isBusy}
      className="flex w-full items-center justify-between gap-3 border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {workspace.name}
        </p>
        <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {workspace.slug}
        </p>
      </div>

      {isBusy ? (
        <LoaderCircleIcon className="size-4 animate-spin text-foreground" />
      ) : (
        <ArrowRightIcon className="size-4 text-muted-foreground" />
      )}
    </button>
  );
}

function appendNextPath(href: string, nextPath?: string) {
  if (!nextPath) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}next=${encodeURIComponent(nextPath)}`;
}

function getLastWorkspaceId(user: unknown) {
  if (!user || typeof user !== "object") return "";
  const value = (user as { lastWorkspaceId?: unknown }).lastWorkspaceId;
  return typeof value === "string" ? value : "";
}

export { WorkspaceSelector };
