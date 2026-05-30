import { Skeleton } from "@/components/ui/skeleton"

export default function HrDocumentDetailLoading() {
  return (
    <section className="grid min-h-0 gap-4 bg-[var(--paper)] px-4 py-4 sm:px-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Skeleton className="h-[70vh] w-full" />
      <Skeleton className="h-[70vh] w-full" />
    </section>
  )
}
