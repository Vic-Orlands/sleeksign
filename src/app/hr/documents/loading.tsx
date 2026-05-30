import { Skeleton } from "@/components/ui/skeleton"

export default function HrDocumentsLoading() {
  return (
    <section className="min-h-0 overflow-auto bg-[var(--paper)]">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-3 w-56" />
      </div>
      <div className="px-4 py-4 sm:px-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-4 h-96 w-full" />
      </div>
    </section>
  )
}
