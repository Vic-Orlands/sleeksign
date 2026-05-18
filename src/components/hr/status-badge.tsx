import { Badge } from "@/components/ui/badge"
import type { DocumentSetupStatus, DocumentStatus, SessionStatus } from "@/components/hr/types"

function StatusBadge({ status }: { status: DocumentStatus | DocumentSetupStatus | SessionStatus | "Opened" | "Signed" | "Not Opened" }) {
  const label = status === "pending" ? "Pending" : status === "completed" ? "Completed" : status
  const tone =
    label === "Completed" || label === "Signed" || label === "Edited"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : label === "In Progress" || label === "Opened"
        ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
        : label === "Needs Setup"
          ? "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300"

  return (
    <Badge variant="outline" className={`rounded-none px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider ${tone}`}>
      {label}
    </Badge>
  )
}

export { StatusBadge }
