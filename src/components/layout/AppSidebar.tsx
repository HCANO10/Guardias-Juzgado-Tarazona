"use client"

import {
  LayoutDashboard,
  Calendar,
  Users,
  Shield,
  Sun,
  Star,
  Settings,
  LogOut,
  UserCircle,
  ClipboardList,
  Scale,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRole } from "@/hooks/use-role"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const navSections = {
  headmaster: [
    { label: "PRINCIPAL", items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Guardias", url: "/guards", icon: Shield },
      { title: "Personal", url: "/staff", icon: Users },
      { title: "Vacaciones", url: "/vacations", icon: Sun },
      { title: "Calendario", url: "/calendar", icon: Calendar },
      { title: "Festivos", url: "/holidays", icon: Star },
    ]},
    { label: "ADMINISTRACIÓN", items: [
      { title: "Actividad", url: "/activity", icon: ClipboardList },
      { title: "Configuración", url: "/settings", icon: Settings },
      { title: "Mi Perfil", url: "/profile", icon: UserCircle },
    ]},
  ],
  worker: [
    { label: "PRINCIPAL", items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Guardias", url: "/guards", icon: Shield },
      { title: "Personal", url: "/staff", icon: Users },
      { title: "Vacaciones", url: "/vacations", icon: Sun },
      { title: "Calendario", url: "/calendar", icon: Calendar },
      { title: "Festivos", url: "/holidays", icon: Star },
      { title: "Mi Perfil", url: "/profile", icon: UserCircle },
    ]},
  ],
}

export function AppSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isHeadmaster } = useRole()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const confirmLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const sections = isHeadmaster ? navSections.headmaster : navSections.worker
  const userInitials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : "??"

  return (
    <>
      <div className="flex flex-col h-full py-6 px-4">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="h-9 w-9 bg-[#0066CC] rounded-[10px] flex items-center justify-center">
            <Scale className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <div
              className="text-[17px] font-semibold text-white tracking-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              Guardias
            </div>
            <div className="text-[11px] text-gray-500 -mt-0.5">
              Juzgado Tarazona
            </div>
          </div>
        </div>

        {/* Nav Sections */}
        <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-hide">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-3 mb-2 text-[10px] font-semibold text-gray-500 tracking-[1.5px] uppercase">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    pathname.startsWith(item.url + "/")
                  return (
                    <Link key={item.title} href={item.url}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] font-medium transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-[#0066CC] text-white"
                            : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
                        }`}
                      >
                        <item.icon
                          className="h-[18px] w-[18px] flex-shrink-0"
                          strokeWidth={isActive ? 2 : 1.75}
                        />
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="mt-auto pt-4 space-y-3">
          {userEmail && (
            <div
              className="bg-white/[0.06] rounded-xl p-3 flex items-center gap-3"
              title={userEmail}
            >
              <div className="h-9 w-9 bg-[#0066CC] text-white rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 uppercase">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-white truncate">
                  {userEmail.split("@")[0]}
                </div>
                <div className="text-[11px] text-gray-500 truncate">
                  {userEmail}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-gray-500 hover:bg-white/[0.06] hover:text-red-400 transition-all text-[13px] font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Logout confirmation dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-[20px] border-black/[0.08] shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold">
              ¿Cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-[#86868B]">
              Se cerrará tu sesión actual y tendrás que volver a identificarte para acceder al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-10 text-[14px]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLogout}
              className="rounded-xl h-10 text-[14px] bg-red-500 hover:bg-red-600 text-white"
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
