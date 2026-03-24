export default function ActivityLoading() {
  return (
    <div className="space-y-8 pb-20 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-100 rounded-xl" />
        <div className="h-4 w-96 bg-gray-50 rounded-lg" />
      </div>
      <div className="h-10 w-48 bg-gray-50 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-50 rounded-[20px]" />
        ))}
      </div>
    </div>
  )
}
