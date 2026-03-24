"use client"

import React from "react"
import { LucideIcon } from "lucide-react"

// ============================================
// DESIGN TOKENS
// ============================================
export const tokens = {
  colors: {
    primary: "#0066CC",
    primaryDark: "#004C99",
    primaryLight: "#EBF4FF",
    accent: "#E42313",
    success: "#22C55E",
    successLight: "#DCFCE7",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    danger: "#DC2626",
    dangerLight: "#FEF2F2",

    bgPage: "#F7F8FA",
    bgSurface: "#FFFFFF",
    bgSidebar: "#0D0D0D",
    bgSubtle: "#F2F3F5",

    textPrimary: "#0D0D0D",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    textInverse: "#FFFFFF",

    border: "#E5E7EB",
    borderLight: "#F3F4F6",

    auxilio: "#F59E0B",
    auxilioLight: "#FEF3C7",
    tramitador: "#3B82F6",
    tramitadorLight: "#DBEAFE",
    gestor: "#10B981",
    gestorLight: "#DCFCE7",
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
// CARD COMPONENT
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
  const base = dark
    ? "bg-neutral-900 text-white border-neutral-800"
    : "bg-white border-gray-200/60"
  return (
    <div
      className={`rounded-2xl ${padding} border shadow-sm ${base} ${
        hover ? "transition-all hover:shadow-md" : ""
      } ${className}`}
    >
      {children}
    </div>
  )
}

// ============================================
// BADGE COMPONENT
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
    neutral: "bg-gray-100 text-gray-600",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    auxilio: "bg-amber-50 text-amber-700",
    tramitador: "bg-blue-50 text-blue-600",
    gestor: "bg-emerald-50 text-emerald-600",
  }
  return (
    <span
      className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full inline-flex items-center justify-center ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

// ============================================
// ICON BOX COMPONENT
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
    neutral: "bg-gray-100 text-gray-600",
    indigo: "bg-indigo-50 text-indigo-500",
    green: "bg-emerald-50 text-emerald-500",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-amber-50 text-amber-500",
    red: "bg-red-50 text-red-500",
    primary: "bg-blue-50 text-[#0066CC]",
    success: "bg-emerald-50 text-emerald-500",
    warning: "bg-amber-50 text-amber-500",
    danger: "bg-red-50 text-red-500",
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
          className="text-2xl md:text-[28px] font-medium tracking-tight text-gray-900"
          style={{ fontFamily: tokens.fonts.heading }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
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
      className={`text-lg font-semibold text-gray-900 ${className}`}
      style={{ fontFamily: tokens.fonts.heading }}
    >
      {children}
    </h2>
  )
}

// ============================================
// BUTTON COMPONENT
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
      "bg-[#0066CC] text-white hover:bg-[#0055AA] shadow-sm",
    secondary:
      "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
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
      className={`font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// ============================================
// METRIC CARD
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
        <span className="text-[13px] text-gray-500">{label}</span>
        <DSIconBox icon={Icon} variant={iconVariant} size="sm" />
      </div>
      <div>
        <p
          className="text-2xl md:text-[28px] font-semibold text-gray-900 tracking-tight"
          style={{ fontFamily: tokens.fonts.heading }}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-[13px] text-gray-500 mt-1">{subtitle}</p>
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
      <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
      </div>
      <h3
        className="text-lg font-medium text-gray-900 mb-1"
        style={{ fontFamily: tokens.fonts.heading }}
      >
        {title}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}

// ============================================
// LOADING SKELETON
// ============================================
export function DSSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200/60 rounded-lg ${className}`}
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
    danger: "bg-red-500",
    neutral: "bg-gray-400",
    info: "bg-blue-500",
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${colors[status]}`} />
      {label && <span className="text-sm text-gray-600">{label}</span>}
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
// ALERT / BANNER
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
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    danger: "bg-red-50 border-red-200 text-red-800",
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

// ============================================
// EQUITY BAR (for guard distribution)
// ============================================
export function DSEquityBar({
  label,
  variant,
  progress,
  isEquitable = true,
}: {
  label: string
  variant: "auxilio" | "tramitador" | "gestor"
  progress: number
  isEquitable?: boolean
}) {
  const colors = {
    auxilio: { bg: "bg-amber-100", fill: "bg-amber-500", text: "text-amber-700", badge: "bg-amber-50 text-amber-600" },
    tramitador: { bg: "bg-blue-100", fill: "bg-blue-500", text: "text-blue-700", badge: "bg-blue-50 text-blue-600" },
    gestor: { bg: "bg-emerald-100", fill: "bg-emerald-500", text: "text-emerald-700", badge: "bg-emerald-50 text-emerald-600" },
  }

  const c = colors[variant]

  return (
    <DSCard padding="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[13px] font-semibold ${c.text}`}>{label}</span>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
          {isEquitable ? "Equitativo" : "Desbalanceado"}
        </span>
      </div>
      <div className={`w-full h-1.5 rounded-full ${c.bg}`}>
        <div
          className={`h-1.5 rounded-full ${c.fill} transition-all`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </DSCard>
  )
}
