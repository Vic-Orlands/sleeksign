import { Skeleton } from "@/components/ui/skeleton"

export default function HrLoading() {
  return (
    <div className="flex h-svh overflow-hidden bg-[var(--paper)]">
      <div className="hidden w-[240px] border-r border-border bg-sidebar p-4 lg:block">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-6 h-8 w-full" />
        <Skeleton className="mt-2 h-8 w-full" />
        <Skeleton className="mt-2 h-8 w-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-background px-4 py-3">
          <Skeleton className="h-8 w-full max-w-xl" />
        </div>
        <div className="p-4 sm:p-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
      </div>
    </div>
  )
}
