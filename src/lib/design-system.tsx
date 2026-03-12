"use client"

import React from "react"
import { LucideIcon } from "lucide-react"

// Card component matching the reference
export function DSCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white rounded-[28px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-black/[0.04] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] ${className}`}>
      {children}
    </div>
  )
}

// Badge component
export function DSBadge({ children, variant = "neutral" }: { children: React.ReactNode, variant?: "neutral" | "indigo" | "green" | "blue" | "orange" | "red" | "amber" | "purple" }) {
  const variants = {
    neutral: "bg-gray-100 text-gray-600",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    blue: "bg-[#EBF4FF] text-[#0066CC]",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  }
  return (
    <span className={`px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full inline-flex items-center justify-center ${variants[variant]}`}>
      {children}
    </span>
  )
}

// IconBox component
export function DSIconBox({ icon: Icon, variant = "neutral", className = "" }: { icon: LucideIcon, variant?: string, className?: string }) {
  const variants: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-600",
    indigo: "bg-indigo-50 text-indigo-500",
    green: "bg-green-50 text-green-500",
    blue: "bg-[#EBF4FF] text-[#0066CC]",
    orange: "bg-orange-50 text-orange-500",
    red: "bg-red-50 text-red-500",
  }
  return (
    <div className={`h-12 w-12 rounded-[16px] flex items-center justify-center ${variants[variant] || variants.neutral} ${className}`}>
      <Icon className="h-6 w-6" strokeWidth={2} />
    </div>
  )
}

// Page header component
export function DSPageHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="space-y-1 mb-8">
      <h1 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-neutral-900">{title}</h1>
      {subtitle && <p className="text-[17px] text-[#86868B] font-medium">{subtitle}</p>}
    </div>
  )
}

// Section heading
export function DSSectionHeading({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return <h2 className={`text-[20px] font-semibold text-neutral-900 mb-4 px-1 ${className}`}>{children}</h2>
}

// Primary button
export function DSButton({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }: any) {
  const variants: Record<string, string> = {
    primary: "bg-[#0066CC] text-white hover:bg-[#0055AA]",
    secondary: "bg-white border border-black/[0.08] text-neutral-900 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`rounded-full px-6 py-2.5 text-[15px] font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

// Position badge helper
export function getPositionBadgeVariant(positionName: string): "amber" | "blue" | "green" | "purple" | "indigo" | "red" | "neutral" {
  if (!positionName) return 'neutral'
  const normalized = positionName.toLowerCase()
  if (normalized.includes('auxilio')) return 'amber'
  if (normalized.includes('tramitador')) return 'blue'
  if (normalized.includes('gestor')) return 'green'
  if (normalized.includes('juez')) return 'purple'
  if (normalized.includes('letrado') || normalized.includes('laj')) return 'indigo'
  if (normalized.includes('médico') || normalized.includes('forense')) return 'red'
  return 'neutral'
}
