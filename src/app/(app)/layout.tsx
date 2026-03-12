import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"
import { UserAvatar } from "@/components/layout/UserAvatar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar userEmail={user?.email} />
        
        <div className="flex flex-1 flex-col">
          {/* Mobile top bar - only visible on small screens */}
          <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/80 px-4 backdrop-blur-lg">
            <SidebarTrigger />
            <span className="text-sm font-semibold text-foreground tracking-tight">Guardias Juzgado</span>
            <UserAvatar email={user?.email} />
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl p-4 md:p-8 page-container">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
