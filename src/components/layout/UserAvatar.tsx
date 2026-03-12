"use client"

export function UserAvatar({ email }: { email?: string }) {
  const initials = email ? email.substring(0, 2).toUpperCase() : "??"
  
  return (
    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-2 ring-background shadow-sm">
      {initials}
    </div>
  )
}
