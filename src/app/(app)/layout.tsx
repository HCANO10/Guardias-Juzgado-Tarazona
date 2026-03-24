import { AppSidebar } from "@/components/layout/AppSidebar"
import { createClient } from "@/lib/supabase/server"
import MobileNav from "@/components/layout/MobileNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "??"

  return (
    <div className="min-h-screen font-sans selection:bg-[#0066CC]/20" style={{ background: "linear-gradient(135deg, #060C18 0%, #0A1025 50%, #060E1C 100%)" }}>
      {/* Ambient background glows — purely decorative */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-[20%] left-[10%] w-[600px] h-[600px] rounded-full bg-[#0066CC]/[0.06] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-[#06B6D4]/[0.04] blur-[100px]" />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-[#6366F1]/[0.03] blur-[80px]" />
      </div>

      {/* Mobile top bar */}
      <MobileNav userEmail={user?.email} userInitials={userInitials} />

      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:flex md:w-[260px] md:h-screen md:flex-col z-30"
        style={{ background: "linear-gradient(180deg, #08101E 0%, #060C18 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <AppSidebar userEmail={user?.email} />
      </aside>

      {/* Main content */}
      <main className="relative z-10 md:ml-[260px] pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-8 lg:px-12 lg:py-10 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
