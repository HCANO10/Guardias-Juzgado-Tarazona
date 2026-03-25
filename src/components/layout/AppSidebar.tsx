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
      { title: "Dashboard",    url: "/dashboard",  icon: LayoutDashboard },
      { title: "Guardias",     url: "/guards",     icon: Shield },
      { title: "Personal",     url: "/staff",      icon: Users },
      { title: "Vacaciones",   url: "/vacations",  icon: Sun },
      { title: "Calendario",   url: "/calendar",   icon: Calendar },
      { title: "Festivos",     url: "/holidays",   icon: Star },
    ]},
    { label: "ADMINISTRACIÓN", items: [
      { title: "Actividad",    url: "/activity",   icon: ClipboardList },
      { title: "Configuración",url: "/settings",   icon: Settings },
      { title: "Mi Perfil",    url: "/profile",    icon: UserCircle },
    ]},
  ],
  worker: [
    { label: "PRINCIPAL", items: [
      { title: "Dashboard",    url: "/dashboard",  icon: LayoutDashboard },
      { title: "Guardias",     url: "/guards",     icon: Shield },
      { title: "Personal",     url: "/staff",      icon: Users },
      { title: "Vacaciones",   url: "/vacations",  icon: Sun },
      { title: "Calendario",   url: "/calendar",   icon: Calendar },
      { title: "Festivos",     url: "/holidays",   icon: Star },
      { title: "Mi Perfil",    url: "/profile",    icon: UserCircle },
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
          <div className="h-9 w-9 rounded-[12px] flex items-center justify-center shadow-sm"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
            <Scale className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <div
              className="text-[17px] font-bold text-slate-800 tracking-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              Guardias
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Juzgado Tarazona
            </div>
          </div>
        </div>

        {/* Nav Sections */}
        <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-hide">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-3 mb-2 text-[10px] font-bold tracking-[1.8px] uppercase text-slate-400">
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
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        <item.icon
                          className={`h-[17px] w-[17px] flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                          strokeWidth={isActive ? 2.2 : 1.75}
                        />
                        <span>{item.title}</span>
                        {isActive && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-indigo-400" />
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="mt-auto pt-4 space-y-2 border-t border-slate-100">
          {userEmail && (
            <div
              className="rounded-xl p-3 flex items-center gap-3 cursor-default bg-slate-50 border border-slate-100"
              title={userEmail}
            >
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 uppercase text-white"
                style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-700 truncate">
                  {userEmail.split("@")[0]}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {userEmail}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Logout confirmation dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-[20px] max-w-sm border-slate-100 bg-white shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-800">
              ¿Cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-500">
              Se cerrará tu sesión actual y tendrás que volver a identificarte para acceder al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-10 text-[14px] bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLogout}
              className="rounded-xl h-10 text-[14px] bg-red-500 hover:bg-red-600 text-white border-none"
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
