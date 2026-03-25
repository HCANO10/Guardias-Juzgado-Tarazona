"use client"

import * as React from "react"
import { Menu, Scale } from "lucide-react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function MobileNav({ userEmail, userInitials }: { userEmail?: string, userInitials: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-xl border-b border-slate-100 z-40 flex items-center justify-between px-4 shadow-sm">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px] border-r border-slate-100 bg-white">
          <AppSidebar userEmail={userEmail} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-[8px] flex items-center justify-center shadow-sm"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
          <Scale className="h-4 w-4 text-white" />
        </div>
        <span className="text-[17px] font-bold tracking-tight text-slate-800" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Guardias</span>
      </div>

      <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-[11px] uppercase shrink-0 text-white"
        style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
        {userInitials}
      </div>
    </div>
  )
}
