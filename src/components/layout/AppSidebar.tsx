"use client"

import { Home, Calendar, Users, Shield, Palmtree, Star, Settings, LogOut, UserCircle } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Calendario", url: "/calendar", icon: Calendar },
  { title: "Personal", url: "/staff", icon: Users },
  { title: "Guardias", url: "/guards", icon: Shield },
  { title: "Vacaciones", url: "/vacations", icon: Palmtree },
  { title: "Festivos", url: "/holidays", icon: Star },
  { title: "Mi Perfil", url: "/profile", icon: UserCircle },
  { title: "Configuración", url: "/settings", icon: Settings },
]

export function AppSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <h2 className="text-lg font-bold tracking-tight text-primary">Guardias Tarazona</h2>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {userEmail && (
          <a href="/profile" className="block mb-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
            <div className="text-xs text-muted-foreground">Conectado como</div>
            <div className="text-sm font-medium truncate" title={userEmail}>{userEmail}</div>
          </a>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
