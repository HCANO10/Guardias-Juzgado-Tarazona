// src/lib/auth/require-role.ts
// Centralized authentication and authorization middleware for API routes
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"

interface AuthResult {
  userId: string
  staffId: string
  role: string
  supabase: SupabaseClient
}

type AuthSuccess = { success: true } & AuthResult
type AuthFailure = { success: false; response: NextResponse }
type AuthCheck = AuthSuccess | AuthFailure

/**
 * Requires the user to be authenticated.
 * Returns user info + supabase client, or a 401 response.
 */
export async function requireAuth(): Promise<AuthCheck> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      ),
    }
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!staff) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Perfil de trabajador no encontrado" },
        { status: 403 }
      ),
    }
  }

  return {
    success: true,
    userId: user.id,
    staffId: staff.id,
    role: staff.role,
    supabase,
  }
}

/**
 * Requires the user to be authenticated AND have headmaster role.
 * Returns user info + supabase client, or a 401/403 response.
 */
export async function requireHeadmaster(): Promise<AuthCheck> {
  const auth = await requireAuth()

  if (!auth.success) return auth

  if (auth.role !== "headmaster" && auth.role !== "admin") {
    return {
      success: false,
      response: NextResponse.json(
        { error: "No autorizado. Se requiere rol headmaster." },
        { status: 403 }
      ),
    }
  }

  return auth
}
