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
          <div className="h-9 w-9 rounded-[10px] flex items-center justify-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0066CC, #0044AA)", boxShadow: "0 0 20px rgba(0,102,204,0.4)" }}>
            <Scale className="h-5 w-5 text-white relative z-10" strokeWidth={2} />
          </div>
          <div>
            <div
              className="text-[17px] font-semibold text-white tracking-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              Guardias
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "rgba(148,163,184,0.7)" }}>
              Juzgado Tarazona
            </div>
          </div>
        </div>

        {/* Nav Sections */}
        <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-hide">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-3 mb-2 text-[10px] font-bold tracking-[1.8px] uppercase"
                style={{ color: "rgba(100,116,139,0.8)" }}>
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
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 cursor-pointer relative ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                        style={isActive ? {
                          background: "linear-gradient(135deg, #0066CC, #0044AA)",
                          boxShadow: "0 2px 20px rgba(0,102,204,0.35), inset 0 1px 0 rgba(255,255,255,0.1)"
                        } : {}}
                      >
                        {!isActive && (
                          <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200"
                            style={{ background: "rgba(255,255,255,0.05)" }} />
                        )}
                        <item.icon
                          className="h-[17px] w-[17px] flex-shrink-0 relative z-10"
                          strokeWidth={isActive ? 2.2 : 1.75}
                        />
                        <span className="relative z-10">{item.title}</span>
                        {isActive && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70 relative z-10" />
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
        <div className="mt-auto pt-4 space-y-2">
          {userEmail && (
            <div
              className="rounded-xl p-3 flex items-center gap-3 cursor-default transition-all duration-200 hover:bg-white/[0.04]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              title={userEmail}
            >
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 uppercase text-white"
                style={{ background: "linear-gradient(135deg, #0066CC, #0044AA)", boxShadow: "0 0 12px rgba(0,102,204,0.3)" }}>
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">
                  {userEmail.split("@")[0]}
                </div>
                <div className="text-[11px] truncate mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
                  {userEmail}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group"
            style={{ color: "rgba(148,163,184,0.7)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(248,113,113,0.08)"
              e.currentTarget.style.color = "rgba(252,165,165,1)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = ""
              e.currentTarget.style.color = "rgba(148,163,184,0.7)"
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Logout confirmation dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-[20px] max-w-sm"
          style={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-white">
              ¿Cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-400">
              Se cerrará tu sesión actual y tendrás que volver a identificarte para acceder al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-10 text-[14px] bg-white/[0.07] border-white/[0.12] text-slate-300 hover:bg-white/[0.12]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLogout}
              className="rounded-xl h-10 text-[14px] bg-red-500/[0.2] hover:bg-red-500/[0.3] text-red-300 border border-red-500/[0.3]"
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
