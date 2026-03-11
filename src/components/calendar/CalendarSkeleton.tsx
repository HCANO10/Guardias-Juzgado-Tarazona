export function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 w-full bg-muted/20 animate-pulse rounded-xl" />
      <div className="h-[600px] w-full bg-muted/10 animate-pulse rounded-xl" />
    </div>
  )
}
