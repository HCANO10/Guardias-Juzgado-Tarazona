"use client"

import { Home, Calendar, Users, Shield, Palmtree, Star, Settings, LogOut, UserCircle, ClipboardList } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRole } from "@/hooks/use-role"
import Link from "next/link"

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
  const { isHeadmaster } = useRole()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

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
    <div className="flex flex-col h-full py-6 px-4">
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="h-8 w-8 bg-neutral-900 text-white rounded-[10px] flex items-center justify-center shadow-sm">
          <Shield className="h-5 w-5 fill-current" />
        </div>
        <span className="text-[20px] font-semibold tracking-tight text-neutral-900">Guardias</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
        {items.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
          return (
            <Link key={item.title} href={item.url}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[15px] font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-black/[0.06] text-neutral-900"
                    : "text-[#86868B] hover:bg-black/[0.03] hover:text-neutral-900"
                }`}
              >
                <item.icon 
                  className={`h-5 w-5 transition-colors ${isActive ? "text-[#0066CC]" : "text-current"}`} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.title}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Card */}
      <div className="mt-auto pt-6 space-y-4">
        {userEmail && (
          <div className="bg-white rounded-[16px] p-3 border border-black/[0.04] shadow-sm flex items-center gap-3">
            <div className="h-9 w-9 bg-[#EBF4FF] text-[#0066CC] rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 uppercase">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-neutral-900 truncate">
                {userEmail.split('@')[0]}
              </div>
              <div className="text-[12px] text-[#86868B] font-medium">
                {isHeadmaster ? "Administrador/a" : "Personal"}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-red-500 hover:bg-red-50 transition-colors text-[14px] font-semibold"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )
}
