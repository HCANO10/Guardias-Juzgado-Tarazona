import { AppSidebar } from "@/components/layout/AppSidebar"
import { createClient } from "@/lib/supabase/server"
import MobileNav from "@/components/layout/MobileNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "??"

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-100" style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #F5F0FF 40%, #FFF0F8 100%)" }}>
      {/* Decorative color blobs — muy suaves, sin agobiar */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-[10%] left-[5%] w-[500px] h-[500px] rounded-full bg-indigo-300/[0.08] blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[5%] w-[400px] h-[400px] rounded-full bg-violet-300/[0.08] blur-[80px]" />
        <div className="absolute top-[50%] left-[40%] w-[300px] h-[300px] rounded-full bg-pink-300/[0.06] blur-[80px]" />
      </div>

      {/* Mobile top bar */}
      <MobileNav userEmail={user?.email} userInitials={userInitials} />

      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:flex md:w-[260px] md:h-screen md:flex-col z-30 bg-white border-r border-slate-100 shadow-[1px_0_8px_rgba(0,0,0,0.04)]">
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
