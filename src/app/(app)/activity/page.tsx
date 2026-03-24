import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ActivityPageClient from "./ActivityPageClient"

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Only headmaster can see activity
  const { data: staffData } = await supabase
    .from("staff")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!staffData || staffData.role !== "headmaster") {
    redirect("/dashboard")
  }

  return <ActivityPageClient />
}
