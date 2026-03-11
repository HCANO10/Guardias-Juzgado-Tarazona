// src/app/(app)/staff/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/table-skeleton"

export default function StaffLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 mt-4">
        <Skeleton className="h-10 w-full md:max-w-xs" />
        <Skeleton className="h-10 w-full md:w-[200px]" />
        <Skeleton className="h-10 w-full md:w-[150px]" />
      </div>

      <TableSkeleton columns={6} rows={10} />
    </div>
  )
}
