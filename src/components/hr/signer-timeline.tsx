import { format } from "date-fns";
import { ClockIcon, MailIcon } from "lucide-react";

import { StatusBadge } from "@/components/hr/status-badge";
import type { SessionRecord } from "@/components/hr/types";

function SignerTimeline({ sessions }: { sessions: SessionRecord[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
        No signer sessions yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {!sessions && (
        <div className="flex gap-3">
          <span className="flex size-8 items-center justify-center rounded-full border bg-background" />
          <div>
            <p className="text-sm font-medium">Completed</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Waiting for all signers to complete
            </p>
          </div>
        </div>
      )}

      {sessions.map((session, index) => (
        <div key={session.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex size-8 items-center justify-center rounded-full border bg-background text-amber-600">
              <ClockIcon className="size-4" />
            </span>
            {index < sessions.length - 1 ? (
              <span className="h-10 w-px bg-border" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">
                {session.signerName || "Anonymous signer"}
              </p>
              <StatusBadge status={session.status} />
            </div>
            <div className="flex items-start gap-1 mt-1">
              <MailIcon className="size-3 text-muted-foreground mt-[2px]" />
              <p className="text-xs text-muted-foreground md:w-[80%]">
                {session.signerEmail || "No email"} signed the document on{" "}
                {format(new Date(session.createdAt), "PPp")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { SignerTimeline };
