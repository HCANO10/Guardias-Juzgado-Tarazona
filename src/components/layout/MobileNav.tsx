"use client"

import * as React from "react"
import { Menu, Shield } from "lucide-react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function MobileNav({ userEmail, userInitials }: { userEmail?: string, userInitials: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 backdrop-blur-xl border-b z-40 flex items-center justify-between px-4"
      style={{ background: "rgba(6, 12, 24, 0.92)", borderColor: "rgba(255,255,255,0.07)" }}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/[0.07] transition-colors">
            <Menu className="h-5 w-5 text-slate-300" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px] border-r-0"
          style={{ background: "linear-gradient(180deg, #08101E 0%, #060C18 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <AppSidebar userEmail={userEmail} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <div className="h-7 w-7 bg-[#0066CC] rounded-[8px] flex items-center justify-center shadow-[0_0_12px_rgba(0,102,204,0.4)]">
          <Shield className="h-4 w-4 text-white fill-current" />
        </div>
        <span className="text-[17px] font-semibold tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Guardias</span>
      </div>

      <div className="h-8 w-8 bg-[#0066CC]/[0.2] text-[#60A5FA] border border-[#0066CC]/[0.3] rounded-full flex items-center justify-center font-bold text-[11px] uppercase shrink-0">
        {userInitials}
      </div>
    </div>
  )
}
