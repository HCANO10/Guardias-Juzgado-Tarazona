"use client"

import dynamic from "next/dynamic"
import { CalendarSkeleton } from "./CalendarSkeleton"

// ssr:false only allowed inside a Client Component (Next.js 15)
const UnifiedCalendar = dynamic(
  () => import("./UnifiedCalendar"),
  { ssr: false, loading: () => <CalendarSkeleton /> }
)

export { UnifiedCalendar }
