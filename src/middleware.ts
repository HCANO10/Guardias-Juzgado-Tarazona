import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// 1. PÚBLICAS — sin autenticación
const publicRoutes = [
  '/login',
  '/api/auth/register',
  '/api/auth/positions',
  '/auth/callback',
]

// 2. SEMI-PÚBLICAS — requieren auth pero NO perfil en staff
const semiPublicRoutes = [
  '/auth/complete-profile',
  '/api/auth/complete-profile',
]

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(r => pathname.startsWith(r))
}

function isSemiPublicRoute(pathname: string): boolean {
  return semiPublicRoutes.some(r => pathname.startsWith(r))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Rutas públicas → pasar siempre
  if (isPublicRoute(pathname)) {
    // Si está autenticado y va a /login, redirigir a /dashboard
    const { data: { user } } = await supabase.auth.getUser()
    if (user && pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Para todo lo demás, verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Rutas semi-públicas → autenticado es suficiente
  if (isSemiPublicRoute(pathname)) {
    return supabaseResponse
  }

  // Rutas protegidas → verificar profile_completed
  const profileCompleted = user.user_metadata?.profile_completed === true
  if (!profileCompleted) {
    // Redirigir a completar perfil
    const url = request.nextUrl.clone()
    url.pathname = '/auth/complete-profile'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
