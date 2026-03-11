import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user?.email} />
      <main className="flex-1 overflow-auto bg-muted/20 relative min-h-screen">
        {/* Header móvil para mostrar en dispositivos pequeños formados por el trigger */}
        <div className="md:hidden flex items-center h-16 px-4 border-b bg-background sticky top-0 z-10 w-full">
          <SidebarTrigger />
          <h1 className="ml-4 font-semibold text-lg truncate">Guardias Tarazona</h1>
        </div>
        <div className="h-full">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
