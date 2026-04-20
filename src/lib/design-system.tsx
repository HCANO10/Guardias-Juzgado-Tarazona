"use client"

import React from "react"
import { LucideIcon } from "lucide-react"

// ============================================
// DESIGN TOKENS — Modo Claro Vivo y Alegre
// ============================================
export const tokens = {
  colors: {
    primary: "#4F46E5",          // Indigo vivo
    primaryDark: "#4338CA",
    primaryLight: "#EEF2FF",
    blue: "#2563EB",
    blueLight: "#EFF6FF",
    emerald: "#059669",
    emeraldLight: "#ECFDF5",
    amber: "#D97706",
    amberLight: "#FFFBEB",
    rose: "#E11D48",
    roseLight: "#FFF1F2",
    violet: "#7C3AED",
    violetLight: "#F5F3FF",
    sky: "#0284C7",
    skyLight: "#F0F9FF",

    bgPage: "#F2F4FC",
    bgCard: "#FFFFFF",
    bgSubtle: "#F8FAFF",

    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#94A3B8",

    border: "#E2E8F0",
    borderLight: "#F1F5F9",

    auxilio: "#D97706",
    tramitador: "#2563EB",
    gestor: "#059669",
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
// CARD COMPONENT — Blanco con sombra suave
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
  void dark
  return (
    <div
      className={`rounded-2xl ${padding} bg-white border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] ${
        hover
          ? "transition-all duration-200 hover:shadow-[0_6px_20px_rgba(79,70,229,0.1)] hover:border-indigo-100 hover:-translate-y-[1px]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  )
}

// ============================================
// BADGE COMPONENT — Colores vivos y claros
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
    neutral:    "bg-slate-100 text-slate-600 border border-slate-200",
    indigo:     "bg-indigo-50 text-indigo-700 border border-indigo-200",
    green:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
    blue:       "bg-blue-50 text-blue-700 border border-blue-200",
    orange:     "bg-orange-50 text-orange-700 border border-orange-200",
    red:        "bg-red-50 text-red-700 border border-red-200",
    amber:      "bg-amber-50 text-amber-700 border border-amber-200",
    purple:     "bg-purple-50 text-purple-700 border border-purple-200",
    auxilio:    "bg-amber-50 text-amber-700 border border-amber-200",
    tramitador: "bg-blue-50 text-blue-700 border border-blue-200",
    gestor:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
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
// ICON BOX COMPONENT — Colores vivos
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
    neutral: "bg-slate-100 text-slate-500",
    indigo:  "bg-indigo-50 text-indigo-600",
    green:   "bg-emerald-50 text-emerald-600",
    blue:    "bg-blue-50 text-blue-600",
    orange:  "bg-orange-50 text-orange-600",
    red:     "bg-red-50 text-red-600",
    amber:   "bg-amber-50 text-amber-600",
    purple:  "bg-purple-50 text-purple-600",
    primary: "bg-indigo-50 text-indigo-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger:  "bg-red-50 text-red-600",
    cyan:    "bg-sky-50 text-sky-600",
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
          className="text-2xl md:text-[28px] font-bold tracking-tight text-slate-900"
          style={{ fontFamily: tokens.fonts.heading }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500">{subtitle}</p>
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
      className={`text-lg font-semibold text-slate-700 ${className}`}
      style={{ fontFamily: tokens.fonts.heading }}
    >
      {children}
    </h2>
  )
}

// ============================================
// BUTTON COMPONENT — Colores vivos y alegres
// ============================================
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost"

export const DSButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode
    variant?: ButtonVariant
    size?: "sm" | "md" | "lg"
  }
>(function DSButton(
  {
    children,
    onClick,
    variant = "primary",
    className = "",
    disabled = false,
    type = "button",
    size = "md",
    ...rest
  },
  ref,
) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] active:scale-[0.98]",
    secondary:
      "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]",
    danger:
      "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300 active:scale-[0.98]",
    ghost:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]",
  }

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
  }

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})

// ============================================
// METRIC CARD — Colores vivos
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
        <span className="text-[13px] text-slate-500">{label}</span>
        <DSIconBox icon={Icon} variant={iconVariant} size="sm" />
      </div>
      <div>
        <p
          className="text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight"
          style={{ fontFamily: tokens.fonts.heading }}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </DSCard>
  )
}

// ============================================
// EMPTY STATE
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
      <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 border border-indigo-100">
        <Icon className="h-7 w-7 text-indigo-400" strokeWidth={1.5} />
      </div>
      <h3
        className="text-lg font-semibold text-slate-700 mb-1"
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
// LOADING SKELETON — Light
// ============================================
export function DSSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-100 rounded-lg ${className}`}
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
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger:  "bg-red-500",
    neutral: "bg-slate-400",
    info:    "bg-blue-500",
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${colors[status]}`} />
      {label && <span className="text-sm text-slate-500">{label}</span>}
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
// ALERT / BANNER — Colores vivos y claros
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
    info:    "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    danger:  "bg-red-50 border-red-200 text-red-800",
  }

  return (
    <div
      className={`rounded-xl border p-4 ${styles[variant]} flex gap-3`}
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
