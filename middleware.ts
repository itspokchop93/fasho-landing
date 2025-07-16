import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// Helper function to get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const host = request.headers.get('host')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (real) {
    return real
  }
  return request.ip || '127.0.0.1'
}

// Helper function to generate session ID from cookies or create new one
function getOrCreateSessionId(request: NextRequest, response: NextResponse): string {
  const existingSessionId = request.cookies.get('active_session_id')?.value
  
  if (existingSessionId) {
    return existingSessionId
  }
  
  // Generate new session ID
  const newSessionId = uuidv4()
  
  // Set session cookie that expires in 24 hours
  response.cookies.set('active_session_id', newSessionId, {
    maxAge: 24 * 60 * 60, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })
  
  return newSessionId
}

// Helper function to track user activity
async function trackUserActivity(
  supabase: any,
  request: NextRequest,
  sessionId: string,
  user: any
) {
  try {
    const currentPage = request.nextUrl.pathname
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const clientIP = getClientIP(request)
    
    // Skip tracking for API routes, static files, and admin routes (except admin dashboard)
    const skipRoutes = ['/api/', '/_next/', '/favicon.ico']
    if (skipRoutes.some(route => currentPage.startsWith(route))) {
      return
    }
    
    // Prepare user data
    let userData = {
      session_id: sessionId,
      ip_address: clientIP,
      user_agent: userAgent,
      current_page: currentPage,
      last_activity: new Date().toISOString(),
      is_guest: !user,
      user_id: user?.id || null,
      first_name: null as string | null,
      last_name: null as string | null,
      email: null as string | null
    }
    
    // If user is authenticated, get user details
    if (user) {
      // Extract name from user metadata or email
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
      const nameParts = fullName.split(' ')
      
      userData.first_name = nameParts[0] || 'User'
      userData.last_name = nameParts.slice(1).join(' ') || null
      userData.email = user.email
      userData.is_guest = false
    }
    
    // Upsert active user record using service role
    const { error: upsertError } = await supabase
      .from('active_users')
      .upsert(userData, {
        onConflict: 'session_id',
        ignoreDuplicates: false
      })
    
    if (upsertError) {
      console.error('🔄 MIDDLEWARE: Error upserting active user:', upsertError)
    }
    
    // Track daily visit
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const { error: visitError } = await supabase.rpc('upsert_daily_visit', {
      visit_date: today,
      visitor_ip: clientIP
    })
    
    if (visitError) {
      console.error('🔄 MIDDLEWARE: Error tracking daily visit:', visitError)
    }
    
    // Occasionally cleanup inactive users (1% chance)
    if (Math.random() < 0.01) {
      const { error: cleanupError } = await supabase.rpc('cleanup_inactive_users')
      if (cleanupError) {
        console.error('🔄 MIDDLEWARE: Error cleaning up inactive users:', cleanupError)
      }
    }
    
  } catch (error) {
    console.error('🔄 MIDDLEWARE: Error tracking user activity:', error)
  }
}

export async function middleware(request: NextRequest) {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables in middleware')
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get or create session ID for tracking
  const sessionId = getOrCreateSessionId(request, supabaseResponse)

  // Refresh session if expired - required for Server Components
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Track user activity (async, non-blocking)
  trackUserActivity(supabase, request, sessionId, user).catch(error => {
    console.error('🔄 MIDDLEWARE: Failed to track user activity:', error)
  })

  // Define protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/add', '/packages', '/checkout', '/thank-you']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // If accessing a protected route without authentication, redirect to signup
  if (isProtectedRoute && (!user || error)) {
    const signupUrl = new URL('/signup', request.url)
    console.log('🔐 MIDDLEWARE: Redirecting unauthenticated user to signup from:', request.nextUrl.pathname)
    return NextResponse.redirect(signupUrl)
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  const authRoutes = ['/signup', '/a-login']
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  if (isAuthRoute && user && !error) {
    const dashboardUrl = new URL('/dashboard', request.url)
    console.log('🔐 MIDDLEWARE: Redirecting authenticated user to dashboard from:', request.nextUrl.pathname)
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 