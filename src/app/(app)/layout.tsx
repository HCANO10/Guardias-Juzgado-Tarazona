import { AppSidebar } from "@/components/layout/AppSidebar"
import { createClient } from "@/lib/supabase/server"
import MobileNav from "@/components/layout/MobileNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "??"

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #F5F0FF 45%, #FDF2FF 100%)" }}
    >
      {/* Decorative blobs — muy sutiles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 left-0 w-[560px] h-[560px] rounded-full opacity-[0.07] blur-[120px]"
          style={{ background: "radial-gradient(circle, #818cf8, #6366f1)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.07] blur-[100px]"
          style={{ background: "radial-gradient(circle, #a78bfa, #8b5cf6)" }} />
      </div>

      {/* Mobile top bar */}
      <MobileNav userEmail={user?.email} userInitials={userInitials} />

      {/* Desktop sidebar — fijo, 260px */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-[260px] md:flex-col z-30 bg-white/95 border-r border-slate-200/60"
        style={{ backdropFilter: "blur(12px)", boxShadow: "1px 0 12px rgba(79,70,229,0.06)" }}>
        <AppSidebar userEmail={user?.email} />
      </aside>

      {/* Main content */}
      <main className="relative z-10 md:pl-[260px] pt-14 md:pt-0 min-h-screen">
        <div className="px-4 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10 max-w-[1400px] mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
