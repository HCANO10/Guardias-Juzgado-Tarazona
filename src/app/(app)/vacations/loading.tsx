// src/app/(app)/vacations/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/table-skeleton"

export default function VacationsLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[280px]" />
        <Skeleton className="h-10 w-[160px]" />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-1 space-y-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div className="md:col-span-3 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
             <Skeleton className="h-10 w-full md:w-[200px]" />
             <Skeleton className="h-10 w-full md:w-[180px]" />
          </div>
          <TableSkeleton columns={5} rows={10} />
        </div>
      </div>
    </div>
  )
}
