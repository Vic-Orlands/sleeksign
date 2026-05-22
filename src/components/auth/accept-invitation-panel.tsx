"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2Icon,
  CheckCircle2Icon,
  LoaderCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function AcceptInvitationPanel({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  React.useEffect(() => {
    let cancelled = false;

    async function acceptInvitation() {
      setStatus("loading");

      try {
        await authClient.$fetch("/organization/accept-invitation", {
          method: "POST",
          body: { invitationId },
        });

        if (cancelled) return;

        setStatus("success");
        toast.success("Workspace invitation accepted");
        router.replace("/hr/documents");
      } catch {
        if (cancelled) return;
        setStatus("error");
        toast.error("Unable to accept this invitation");
      }
    }

    acceptInvitation();

    return () => {
      cancelled = true;
    };
  }, [invitationId, router]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--paper)] px-4 py-8 text-foreground">
      <div className="w-full max-w-md border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl ruthie-regular">SleekSign</span>
        </div>

        <div className="mt-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Workspace Invitation
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal">
            {status === "error"
              ? "This invitation needs attention"
              : "Joining workspace"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === "error"
              ? "The invitation may be expired, already used, or tied to a different account."
              : "We are connecting your account to the invited workspace now."}
          </p>
        </div>

        <div className="mt-6 border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
            ) : status === "success" ? (
              <CheckCircle2Icon className="size-5 text-emerald-500" />
            ) : (
              <Building2Icon className="size-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {status === "loading"
                  ? "Accepting invitation"
                  : status === "success"
                    ? "Workspace joined"
                    : "Invitation unavailable"}
              </p>
              <p className="text-xs text-muted-foreground">
                {status === "error"
                  ? "Try signing in with the invited email address."
                  : "You will be taken into Documents as soon as the workspace is ready."}
              </p>
            </div>
          </div>
        </div>

        {status === "error" ? (
          <div className="mt-6 flex gap-2">
            <Button
              className="flex-1"
              onClick={() =>
                router.push(
                  `/signin?next=${encodeURIComponent(`/accept-invitation/${invitationId}`)}`,
                )
              }
            >
              Sign In Again
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                router.push(
                  `/signup?next=${encodeURIComponent(`/accept-invitation/${invitationId}`)}`,
                )
              }
            >
              Create Account
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export { AcceptInvitationPanel };
