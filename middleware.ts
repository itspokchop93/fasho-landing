import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // TEMPORARILY DISABLED FOR TESTING
  console.log('🔐 MIDDLEWARE: Skipping auth check for testing');
  return NextResponse.next();
  
  // // Validate environment variables
  // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // if (!supabaseUrl || !supabaseKey) {
  //   console.error('Missing Supabase environment variables in middleware')
  //   return NextResponse.next()
  // }

  // let supabaseResponse = NextResponse.next({
  //   request,
  // })

  // const supabase = createServerClient(
  //   supabaseUrl,
  //   supabaseKey,
  //   {
  //     cookies: {
  //       get(name: string) {
  //         return request.cookies.get(name)?.value
  //       },
  //       set(name: string, value: string, options: any) {
  //         request.cookies.set({
  //           name,
  //           value,
  //           ...options,
  //         })
  //         supabaseResponse = NextResponse.next({
  //           request: {
  //             headers: request.headers,
  //           },
  //         })
  //         supabaseResponse.cookies.set({
  //           name,
  //           value,
  //           ...options,
  //         })
  //       },
  //       remove(name: string, options: any) {
  //         request.cookies.set({
  //           name,
  //           value: '',
  //           ...options,
  //         })
  //         supabaseResponse = NextResponse.next({
  //           request: {
  //             headers: request.headers,
  //           },
  //         })
  //         supabaseResponse.cookies.set({
  //           name,
  //           value: '',
  //           ...options,
  //         })
  //       },
  //     },
  //   }
  // )

  // // Refresh session if expired - required for Server Components
  // await supabase.auth.getUser()

  // return supabaseResponse
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