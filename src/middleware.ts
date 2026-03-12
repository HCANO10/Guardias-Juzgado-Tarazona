import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// 1. PÚBLICAS — sin autenticación
const publicRoutes = ['/login', '/api/auth/register', '/api/auth/positions', '/auth/callback']

// 2. SEMI-PÚBLICAS — requieren auth pero NO perfil en staff
const semiPublicRoutes = ['/auth/complete-profile', '/api/auth/complete-profile']

// 3. SOLO HEADMASTER — rutas de gestión
const headmasterOnlyRoutes = ['/staff', '/settings', '/activity']
const headmasterOnlyApiRoutes = [
  '/api/staff/create', '/api/staff/deactivate', '/api/staff/reactivate',
  '/api/staff/change-role', '/api/staff/audit',
  '/api/groq/generate-guards', '/api/guards/generate-periods',
]

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(r => pathname.startsWith(r))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Rutas públicas
  if (matchesRoute(pathname, publicRoutes)) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Rutas semi-públicas (auth pero sin perfil)
  if (matchesRoute(pathname, semiPublicRoutes)) {
    return supabaseResponse
  }

  // Verificar profile_completed y role (Prioridad: Cookie > Metadata > DB)
  const profileStatusCookie = request.cookies.get('staff-profile-status')?.value
  let profileCompleted = profileStatusCookie?.startsWith('true') === true
  let userRole = profileStatusCookie?.split(':')[1] as 'headmaster' | 'worker' | undefined

  if (!profileStatusCookie || !userRole) {
    // Si no hay cookie o no tiene el rol, intentamos metadata
    profileCompleted = user.user_metadata?.profile_completed === true
    userRole = user.user_metadata?.role || 'worker'
    
    // Si no tenemos certeza total, consultamos DB (último recurso)
    if (!profileStatusCookie) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, role')
        .eq('auth_user_id', user.id)
        .single()
      
      profileCompleted = !!staff
      userRole = staff?.role as 'headmaster' | 'worker' || 'worker'
    }

    // Guardar en cookie para futuras peticiones
    supabaseResponse.cookies.set('staff-profile-status', `${profileCompleted ? 'true' : 'false'}:${userRole}`, {
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: '/',
    })
  }

  if (!profileCompleted) {
    return NextResponse.redirect(new URL('/auth/complete-profile', request.url))
  }

  // Verificar rutas de Headmaster
  const isHeadmasterRoute = matchesRoute(pathname, headmasterOnlyRoutes)
  const isHeadmasterApi = matchesRoute(pathname, headmasterOnlyApiRoutes)

  if (isHeadmasterRoute || isHeadmasterApi) {
    if (userRole !== 'headmaster') {
      if (isHeadmasterApi) {
        return NextResponse.json({ error: 'Acceso denegado. Se requiere rol headmaster.' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
