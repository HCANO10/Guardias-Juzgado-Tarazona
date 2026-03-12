import { AppSidebar } from "@/components/layout/AppSidebar"
import { createClient } from "@/lib/supabase/server"
import MobileNav from "@/components/layout/MobileNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "??"

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans selection:bg-[#0066CC]/10">
      {/* Mobile top bar */}
      <MobileNav userEmail={user?.email} userInitials={userInitials} />
      
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:flex md:w-[260px] md:h-screen md:flex-col md:border-r md:border-black/[0.06] md:bg-[#F2F2F7]/80 md:backdrop-blur-xl z-30">
        <AppSidebar userEmail={user?.email} />
      </aside>
      
      {/* Main content */}
      <main className="md:ml-[260px] pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-8 lg:p-12 max-w-[1400px] mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}
