"use client"

import * as React from "react"
import { Menu, Scale } from "lucide-react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function MobileNav({ userEmail, userInitials }: { userEmail?: string, userInitials: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4 border-b border-slate-100"
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[270px] border-r border-slate-100 bg-white shadow-2xl">
          <AppSidebar userEmail={userEmail} />
        </SheetContent>
      </Sheet>

      {/* Logo central */}
      <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
        >
          <Scale className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
        </div>
        <span
          className="text-[15px] font-bold tracking-tight text-slate-800"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          Guardias
        </span>
      </div>

      {/* Avatar usuario */}
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
      >
        {userInitials}
      </div>
    </div>
  )
}
