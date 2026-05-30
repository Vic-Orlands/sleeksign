import { Skeleton } from "@/components/ui/skeleton"

export default function HrShareLoading() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-6">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="mt-4 h-[60vh] w-full" />
    </section>
  )
}
