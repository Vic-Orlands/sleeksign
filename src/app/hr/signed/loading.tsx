import { Skeleton } from "@/components/ui/skeleton"

export default function HrSignedLoading() {
  return (
    <section className="min-h-0 overflow-auto bg-[var(--paper)] px-4 py-4 sm:px-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-96 w-full" />
    </section>
  )
}
