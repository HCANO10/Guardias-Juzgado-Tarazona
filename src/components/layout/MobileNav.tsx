"use client"

import * as React from "react"
import { Menu, Shield } from "lucide-react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function MobileNav({ userEmail, userInitials }: { userEmail?: string, userInitials: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#F2F2F7]/80 backdrop-blur-xl border-b border-black/[0.06] z-40 flex items-center justify-between px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-black/[0.03] transition-colors">
            <Menu className="h-6 w-6 text-neutral-900" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px] bg-[#F2F2F7] border-r-0">
          <AppSidebar userEmail={userEmail} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <div className="h-7 w-7 bg-neutral-900 text-white rounded-[8px] flex items-center justify-center">
          <Shield className="h-4 w-4 fill-current" />
        </div>
        <span className="text-[17px] font-semibold tracking-tight text-neutral-900">Guardias</span>
      </div>

      <div className="h-8 w-8 bg-[#EBF4FF] text-[#0066CC] rounded-full flex items-center justify-center font-bold text-[11px] uppercase shrink-0">
        {userInitials}
      </div>
    </div>
  )
}
