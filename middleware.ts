import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_ENABLED } from '@/lib/config'
import { getSupabaseKey } from '@/lib/supabase/env'

export async function middleware(request: NextRequest) {
  if (!AUTH_ENABLED) {
    if (request.nextUrl.pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/auth')
  const isAuthCallback = pathname === '/auth/callback'
  const isApiRoute = pathname.startsWith('/api')

  if (!user && !isAuthPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (user && isAuthPage && !isAuthCallback) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
