import { AppSidebar } from "@/components/layout/AppSidebar"
import { createClient } from "@/lib/supabase/server"
import MobileNav from "@/components/layout/MobileNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "??"

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans selection:bg-[#0066CC]/10">
      {/* Mobile top bar */}
      <MobileNav userEmail={user?.email} userInitials={userInitials} />

      {/* Desktop sidebar - Dark */}
      <aside className="hidden md:fixed md:flex md:w-[260px] md:h-screen md:flex-col md:bg-[#0D0D0D] z-30">
        <AppSidebar userEmail={user?.email} />
      </aside>

      {/* Main content */}
      <main className="md:ml-[260px] pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-8 lg:px-12 lg:py-10 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
