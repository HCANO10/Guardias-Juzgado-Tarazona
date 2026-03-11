// src/app/(app)/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-10 w-[200px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[150px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-3">
          <Card className="border-border/50 bg-card/60">
            <CardHeader className="pb-2 border-b">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-[150px]" />
                <Skeleton className="h-8 w-[120px]" />
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <Skeleton className="h-4 w-[120px]" />
            </CardHeader>
            <CardContent className="grid gap-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
