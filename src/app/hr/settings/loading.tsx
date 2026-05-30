import { Skeleton } from "@/components/ui/skeleton"

export default function HrSettingsLoading() {
  return (
    <section className="min-h-0 overflow-auto bg-[var(--paper)] px-4 py-4 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="border border-border bg-background p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </section>
  )
}
