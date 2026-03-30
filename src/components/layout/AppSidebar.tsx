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
  ArrowLeftRight,
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
      { title: "Dashboard",    url: "/dashboard",      icon: LayoutDashboard },
      { title: "Guardias",     url: "/guards",         icon: Shield },
      { title: "Personal",     url: "/staff",          icon: Users },
      { title: "Vacaciones",   url: "/vacations",      icon: Sun },
      { title: "Intercambios", url: "/intercambios",   icon: ArrowLeftRight },
      { title: "Calendario",   url: "/calendar",       icon: Calendar },
      { title: "Festivos",     url: "/holidays",       icon: Star },
    ]},
    { label: "ADMINISTRACIÓN", items: [
      { title: "Actividad",    url: "/activity",   icon: ClipboardList },
      { title: "Configuración",url: "/settings",   icon: Settings },
      { title: "Mi Perfil",    url: "/profile",    icon: UserCircle },
    ]},
  ],
  worker: [
    { label: "PRINCIPAL", items: [
      { title: "Dashboard",    url: "/dashboard",      icon: LayoutDashboard },
      { title: "Guardias",     url: "/guards",         icon: Shield },
      { title: "Personal",     url: "/staff",          icon: Users },
      { title: "Vacaciones",   url: "/vacations",      icon: Sun },
      { title: "Intercambios", url: "/intercambios",   icon: ArrowLeftRight },
      { title: "Calendario",   url: "/calendar",       icon: Calendar },
      { title: "Festivos",     url: "/holidays",       icon: Star },
      { title: "Mi Perfil",    url: "/profile",        icon: UserCircle },
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
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
          >
            <Scale className="h-[18px] w-[18px] text-white" strokeWidth={2} />
          </div>
          <div>
            <div
              className="text-[16px] font-bold text-slate-800 leading-tight tracking-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              Guardias
            </div>
            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
              Juzgado Tarazona
            </div>
          </div>
        </div>

        {/* Nav Sections */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3">
          {sections.map((section, sIdx) => (
            <div key={section.label} className={sIdx > 0 ? "mt-6" : ""}>
              <div className="px-3 mb-1.5 text-[10px] font-bold tracking-[2px] uppercase text-slate-400/80">
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
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 cursor-pointer group ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        <item.icon
                          className={`h-4 w-4 flex-shrink-0 transition-colors ${
                            isActive
                              ? "text-indigo-600"
                              : "text-slate-400 group-hover:text-slate-600"
                          }`}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span className="flex-1">{item.title}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
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
        <div className="px-3 py-3 border-t border-slate-100 space-y-1">
          {userEmail && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
              >
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-slate-700 truncate leading-tight">
                  {userEmail.split("@")[0]}
                </div>
                <div className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                  {userEmail}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 transition-all duration-150 hover:bg-red-50 hover:text-red-600 group"
          >
            <LogOut className="h-4 w-4 group-hover:text-red-500 transition-colors" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Logout confirmation dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-[20px] max-w-sm border-slate-100 bg-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-800">
              ¿Cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-500">
              Se cerrará tu sesión y tendrás que volver a identificarte para acceder.
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
