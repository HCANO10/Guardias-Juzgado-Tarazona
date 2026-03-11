import { createClient } from '@supabase/supabase-js'

// Crea un cliente de Supabase con Service Role Key.
// ADVERTENCIA: Este cliente tiene privilegios de administrador y se salta Row Level Security (RLS).
// NUNCA debe ser expuesto en el cliente/navegador. SOLO usar en API Routes o Server Actions seguras.

export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
