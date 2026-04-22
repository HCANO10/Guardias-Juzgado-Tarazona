import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getApiRateLimit } from '@/lib/rate-limit-tiers'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // ── CSRF protection: validar Origin en rutas de escritura ──
  if (
    pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  ) {
    const origin = request.headers.get('origin')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    // Allow same-origin, localhost dev, and Vercel preview URLs
    const isAllowed = !origin
      || origin === appUrl
      || origin.startsWith('http://localhost')
      || origin.startsWith('https://localhost')
      || origin.endsWith('.vercel.app')
    if (!isAllowed) {
      return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
    }
  }

  // ── Rate limiting for API routes ──
  if (pathname.startsWith('/api/')) {
    const rateConfig = getApiRateLimit(pathname, request.method)

    // Use IP + pathname as the rate limit key
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const key = `${ip}:${pathname}`

    const result = checkRateLimit(key, rateConfig)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
          retryAfterSeconds: Math.ceil(result.retryAfterMs / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(result.retryAfterMs / 1000).toString(),
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())

    return response
  }

  // ── Supabase auth for page routes ──
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes — always allow
  const publicRoutes = ['/login', '/auth/callback']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Not authenticated → go to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Los administradores del sistema (sin registro de staff) acceden libremente
  const isSystemAdmin = user.app_metadata?.is_system_admin === true
  if (isSystemAdmin) {
    if (pathname === '/') return NextResponse.redirect(new URL('/dashboard', request.url))
    return response
  }

  // Check if user has a staff profile
  const { data: staff } = await supabase
    .from('staff')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  // No staff record → complete profile (but don't redirect if already there)
  if (!staff) {
    if (pathname === '/auth/complete-profile') {
      return response // Allow access to complete-profile
    }
    return NextResponse.redirect(new URL('/auth/complete-profile', request.url))
  }

  // Has staff record but is on complete-profile → go to dashboard
  if (pathname === '/auth/complete-profile') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Headmaster-only routes
  const headmasterRoutes = ['/settings', '/activity']
  const isHeadmasterRoute = headmasterRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  ) || pathname.startsWith('/staff/') // Specific detail pages are still restricted
  
  if (isHeadmasterRoute && staff.role !== 'headmaster' && staff.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Root path → dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
