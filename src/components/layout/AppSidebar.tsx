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
        { title: "Dashboard", url: "/dashboard", icon: Home },
        { title: "Personal", url: "/staff", icon: Users },
        { title: "Guardias", url: "/guards", icon: Shield },
        { title: "Vacaciones", url: "/vacations", icon: Palmtree },
        { title: "Festivos", url: "/holidays", icon: Star },
        { title: "Calendario", url: "/calendar", icon: Calendar },
        { title: "Actividad", url: "/activity", icon: ClipboardList },
        { title: "Configuración", url: "/settings", icon: Settings },
        { title: "Mi Perfil", url: "/profile", icon: UserCircle },
      ]
    : [
        { title: "Dashboard", url: "/dashboard", icon: Home },
        { title: "Personal", url: "/staff", icon: Users },
        { title: "Guardias", url: "/guards", icon: Shield },
        { title: "Vacaciones", url: "/vacations", icon: Palmtree },
        { title: "Festivos", url: "/holidays", icon: Star },
        { title: "Calendario", url: "/calendar", icon: Calendar },
        { title: "Mi Perfil", url: "/profile", icon: UserCircle },
      ]

  const userInitials = userEmail ? userEmail.substring(0, 2).toUpperCase() : "??"

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar-background">
      <SidebarHeader className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Guardias</h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive} 
                      className={`
                        rounded-xl transition-all duration-200 h-10 px-3
                        ${isActive 
                          ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground" 
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}
                      `}
                    >
                      <a href={item.url} className="flex items-center gap-3">
                        <item.icon className={`h-5 w-5 ${isActive ? "text-primary-foreground" : ""}`} />
                        <span className="font-medium">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar-background mt-auto">
        <div className="space-y-4">
          {userEmail && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold shadow-inner ring-2 ring-background">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{userEmail.split('@')[0]}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 border-none shadow-none font-medium ${
                      isHeadmaster
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isHeadmaster ? '👑 Admin' : '👤 Personal'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleLogout} 
                className="rounded-xl h-10 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Cerrar sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
