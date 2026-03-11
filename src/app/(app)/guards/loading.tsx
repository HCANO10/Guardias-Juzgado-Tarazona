// src/app/(app)/guards/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function GuardsLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-10 w-[200px]" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-6 w-[250px]" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Skeleton className="h-10 w-full md:w-[150px]" />
          <Skeleton className="h-10 w-full md:w-[220px]" />
          <Skeleton className="h-10 w-full md:w-[180px]" />
        </div>
        <TableSkeleton columns={7} rows={8} />
      </div>
    </div>
  )
}
