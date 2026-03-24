import { Skeleton } from "@/components/ui/skeleton"
import { DSCard } from "@/lib/design-system"

export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-10 w-[200px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DSCard key={i}>
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-[120px] mb-2" />
            <Skeleton className="h-3 w-[150px]" />
          </DSCard>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-3">
          <DSCard>
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-8 w-[120px]" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-[12px]" />
          </DSCard>
        </div>
        <div className="space-y-6">
          <DSCard>
            <Skeleton className="h-4 w-[120px] mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-[10px]" />
              ))}
            </div>
          </DSCard>
        </div>
      </div>
    </div>
  )
}
