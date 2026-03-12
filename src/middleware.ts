import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
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
  const pathname = request.nextUrl.pathname

  // Public routes — always allow
  const publicRoutes = ['/login', '/auth/callback', '/api/']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // But if user is authenticated and going to /login, redirect to dashboard
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Not authenticated → go to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
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
  
  if (isHeadmasterRoute && staff.role !== 'headmaster') {
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
