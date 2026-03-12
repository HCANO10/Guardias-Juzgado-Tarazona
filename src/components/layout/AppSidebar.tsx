"use client"

import { Home, Calendar, Users, Shield, Palmtree, Star, Settings, LogOut, UserCircle, ClipboardList, FileDown } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRole } from "@/hooks/use-role"
import { Badge } from "@/components/ui/badge"
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

const commonItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Calendario", url: "/calendar", icon: Calendar },
  { title: "Guardias", url: "/guards", icon: Shield },
  { title: "Vacaciones", url: "/vacations", icon: Palmtree },
  { title: "Festivos", url: "/holidays", icon: Star },
  { title: "Mi Perfil", url: "/profile", icon: UserCircle },
]

const headmasterItems = [
  { title: "Personal", url: "/staff", icon: Users },
  { title: "Actividad", url: "/activity", icon: ClipboardList },
  { title: "Configuración", url: "/settings", icon: Settings },
]

export function AppSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isHeadmaster, isLoading, role } = useRole()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  // Build menu items based on role
  const items = isHeadmaster
    ? [
        commonItems[0], // Dashboard
        commonItems[1], // Calendario
        { title: "Personal", url: "/staff", icon: Users },
        commonItems[2], // Guardias
        commonItems[3], // Vacaciones
        commonItems[4], // Festivos
        { title: "Actividad", url: "/activity", icon: ClipboardList },
        { title: "Configuración", url: "/settings", icon: Settings },
        commonItems[5], // Mi Perfil
      ]
    : commonItems

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
            <div className="flex items-center gap-2 mb-0.5">
              <div className="text-xs text-muted-foreground">Conectado como</div>
              {!isLoading && role && (
                <Badge
                  variant={isHeadmaster ? "default" : "secondary"}
                  className={`text-[10px] px-1.5 py-0 h-4 ${
                    isHeadmaster
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {isHeadmaster ? '👑 Headmaster' : '👤 Trabajador'}
                </Badge>
              )}
            </div>
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
