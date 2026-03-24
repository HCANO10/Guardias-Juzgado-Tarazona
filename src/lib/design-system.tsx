"use client"

import React from "react"
import { LucideIcon } from "lucide-react"

// ============================================
// DESIGN TOKENS — Dark Mode Premium
// ============================================
export const tokens = {
  colors: {
    primary: "#0066CC",
    primaryDark: "#0055AA",
    primaryLight: "rgba(0,102,204,0.15)",
    accent: "#06B6D4",           // Cyan accent for glassmorphism
    accentLight: "rgba(6,182,212,0.15)",
    success: "#34D399",
    successLight: "rgba(52,211,153,0.15)",
    warning: "#FBBF24",
    warningLight: "rgba(251,191,36,0.15)",
    danger: "#F87171",
    dangerLight: "rgba(248,113,113,0.15)",

    bgPage: "#060C18",           // Deep navy page background
    bgSurface: "rgba(255,255,255,0.05)",  // Glassmorphism surface
    bgSidebar: "#080E1C",
    bgSubtle: "rgba(255,255,255,0.04)",

    textPrimary: "#F1F5F9",      // Near white
    textSecondary: "#94A3B8",    // Slate-400
    textMuted: "#64748B",        // Slate-500
    textInverse: "#060C18",

    border: "rgba(255,255,255,0.08)",
    borderLight: "rgba(255,255,255,0.05)",

    auxilio: "#FBBF24",
    auxilioLight: "rgba(251,191,36,0.15)",
    tramitador: "#60A5FA",
    tramitadorLight: "rgba(96,165,250,0.15)",
    gestor: "#34D399",
    gestorLight: "rgba(52,211,153,0.15)",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
  },
  fonts: {
    heading: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
} as const

// ============================================
// CARD COMPONENT — Glassmorphism dark
// ============================================
export function DSCard({
  children,
  className = "",
  padding = "p-6",
  hover = true,
  dark = false,
}: {
  children: React.ReactNode
  className?: string
  padding?: string
  hover?: boolean
  dark?: boolean
}) {
  void dark // keep for API compat, always dark now
  return (
    <div
      className={`rounded-2xl ${padding} border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl shadow-[0_1px_30px_rgba(0,0,0,0.3)] ${
        hover
          ? "transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.12] hover:shadow-[0_4px_40px_rgba(0,0,0,0.4)]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  )
}

// ============================================
// BADGE COMPONENT — Dark variants
// ============================================
export type BadgeVariant =
  | "neutral"
  | "indigo"
  | "green"
  | "blue"
  | "orange"
  | "red"
  | "amber"
  | "purple"
  | "auxilio"
  | "tramitador"
  | "gestor"

export function DSBadge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  const variants: Record<BadgeVariant, string> = {
    neutral:    "bg-white/[0.09] text-slate-300 border border-white/[0.08]",
    indigo:     "bg-indigo-500/[0.18] text-indigo-300 border border-indigo-500/[0.2]",
    green:      "bg-emerald-500/[0.18] text-emerald-300 border border-emerald-500/[0.2]",
    blue:       "bg-blue-500/[0.18] text-blue-300 border border-blue-500/[0.2]",
    orange:     "bg-orange-500/[0.18] text-orange-300 border border-orange-500/[0.2]",
    red:        "bg-red-500/[0.18] text-red-300 border border-red-500/[0.2]",
    amber:      "bg-amber-500/[0.18] text-amber-300 border border-amber-500/[0.2]",
    purple:     "bg-purple-500/[0.18] text-purple-300 border border-purple-500/[0.2]",
    auxilio:    "bg-amber-500/[0.18] text-amber-300 border border-amber-500/[0.2]",
    tramitador: "bg-blue-500/[0.18] text-blue-300 border border-blue-500/[0.2]",
    gestor:     "bg-emerald-500/[0.18] text-emerald-300 border border-emerald-500/[0.2]",
  }
  return (
    <span
      className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full inline-flex items-center justify-center transition-all ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

// ============================================
// ICON BOX COMPONENT — Dark variants
// ============================================
export function DSIconBox({
  icon: Icon,
  variant = "neutral",
  size = "md",
  className = "",
}: {
  icon: LucideIcon
  variant?: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const variants: Record<string, string> = {
    neutral: "bg-white/[0.08] text-slate-400",
    indigo:  "bg-indigo-500/[0.18] text-indigo-400",
    green:   "bg-emerald-500/[0.18] text-emerald-400",
    blue:    "bg-blue-500/[0.18] text-blue-400",
    orange:  "bg-amber-500/[0.18] text-amber-400",
    red:     "bg-red-500/[0.18] text-red-400",
    primary: "bg-blue-500/[0.18] text-[#60A5FA]",
    success: "bg-emerald-500/[0.18] text-emerald-400",
    warning: "bg-amber-500/[0.18] text-amber-400",
    danger:  "bg-red-500/[0.18] text-red-400",
    cyan:    "bg-cyan-500/[0.18] text-cyan-400",
  }

  const sizes = {
    sm: "h-9 w-9 rounded-lg",
    md: "h-10 w-10 rounded-xl",
    lg: "h-12 w-12 rounded-xl",
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  return (
    <div
      className={`flex items-center justify-center ${sizes[size]} ${
        variants[variant] || variants.neutral
      } ${className}`}
    >
      <Icon className={iconSizes[size]} strokeWidth={2} />
    </div>
  )
}

// ============================================
// PAGE HEADER COMPONENT
// ============================================
export function DSPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="space-y-1">
        <h1
          className="text-2xl md:text-[28px] font-medium tracking-tight text-white"
          style={{ fontFamily: tokens.fonts.heading }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-400">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}

// ============================================
// SECTION HEADING
// ============================================
export function DSSectionHeading({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      className={`text-lg font-semibold text-slate-200 ${className}`}
      style={{ fontFamily: tokens.fonts.heading }}
    >
      {children}
    </h2>
  )
}

// ============================================
// BUTTON COMPONENT — Dark variants
// ============================================
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost"

export function DSButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
  size = "md",
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  className?: string
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  size?: "sm" | "md" | "lg"
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[#0066CC] text-white hover:bg-[#0055BB] shadow-[0_0_20px_rgba(0,102,204,0.25)] hover:shadow-[0_0_28px_rgba(0,102,204,0.4)] active:scale-[0.98]",
    secondary:
      "bg-white/[0.07] border border-white/[0.12] text-slate-200 hover:bg-white/[0.12] hover:border-white/[0.18] active:scale-[0.98]",
    danger:
      "bg-red-500/[0.15] text-red-300 hover:bg-red-500/[0.25] border border-red-500/[0.25] hover:border-red-500/[0.4] active:scale-[0.98]",
    ghost:
      "text-slate-400 hover:bg-white/[0.07] hover:text-white active:scale-[0.98]",
  }

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// ============================================
// METRIC CARD — Dark glassmorphism
// ============================================
export function DSMetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconVariant = "primary",
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconVariant?: string
}) {
  return (
    <DSCard className="flex flex-col gap-3" padding="p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-slate-400">{label}</span>
        <DSIconBox icon={Icon} variant={iconVariant} size="sm" />
      </div>
      <div>
        <p
          className="text-2xl md:text-[28px] font-semibold text-white tracking-tight"
          style={{ fontFamily: tokens.fonts.heading }}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-[13px] text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
    </DSCard>
  )
}

// ============================================
// EMPTY STATE — Dark
// ============================================
export function DSEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-white/[0.07] flex items-center justify-center mb-4 border border-white/[0.08]">
        <Icon className="h-7 w-7 text-slate-500" strokeWidth={1.5} />
      </div>
      <h3
        className="text-lg font-medium text-slate-200 mb-1"
        style={{ fontFamily: tokens.fonts.heading }}
      >
        {title}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}

// ============================================
// LOADING SKELETON — Dark
// ============================================
export function DSSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-white/[0.07] rounded-lg ${className}`}
    />
  )
}

export function DSCardSkeleton() {
  return (
    <DSCard hover={false}>
      <div className="space-y-3">
        <DSSkeleton className="h-4 w-24" />
        <DSSkeleton className="h-8 w-20" />
        <DSSkeleton className="h-3 w-32" />
      </div>
    </DSCard>
  )
}

// ============================================
// STATUS INDICATOR
// ============================================
export function DSStatusDot({
  status,
  label,
}: {
  status: "success" | "warning" | "danger" | "neutral" | "info"
  label?: string
}) {
  const colors = {
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger:  "bg-red-400",
    neutral: "bg-slate-500",
    info:    "bg-blue-400",
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${colors[status]} shadow-sm`} />
      {label && <span className="text-sm text-slate-400">{label}</span>}
    </span>
  )
}

// ============================================
// POSITION BADGE HELPER
// ============================================
export function getPositionBadgeVariant(
  positionName: string
): BadgeVariant {
  if (!positionName) return "neutral"
  const normalized = positionName.toLowerCase()
  if (normalized.includes("auxilio")) return "auxilio"
  if (normalized.includes("tramitador")) return "tramitador"
  if (normalized.includes("gestor")) return "gestor"
  if (normalized.includes("juez")) return "purple"
  if (normalized.includes("letrado") || normalized.includes("laj"))
    return "indigo"
  if (normalized.includes("médico") || normalized.includes("forense"))
    return "red"
  return "neutral"
}

// ============================================
// ALERT / BANNER — Dark variants
// ============================================
export function DSAlert({
  variant = "info",
  title,
  children,
  icon: Icon,
}: {
  variant?: "info" | "success" | "warning" | "danger"
  title?: string
  children: React.ReactNode
  icon?: LucideIcon
}) {
  const styles = {
    info:    "bg-blue-500/[0.12] border-blue-500/[0.25] text-blue-200",
    success: "bg-emerald-500/[0.12] border-emerald-500/[0.25] text-emerald-200",
    warning: "bg-amber-500/[0.12] border-amber-500/[0.25] text-amber-200",
    danger:  "bg-red-500/[0.12] border-red-500/[0.25] text-red-200",
  }

  return (
    <div
      className={`rounded-xl border p-4 backdrop-blur-sm ${styles[variant]} flex gap-3`}
    >
      {Icon && (
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={2} />
      )}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-0.5">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  )
}
