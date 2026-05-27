import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/otp', '/pending']
const VALID_ROLES = ['admin', 'agent', 'owner'] as const

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('accessToken')?.value

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (accessToken) {
      const role = request.cookies.get('userRole')?.value
      // Only redirect away from public pages when we have a recognised role.
      // If role is missing/invalid the default was '/login' which causes an
      // infinite redirect loop — so we let the user stay on the public page.
      if (role && (VALID_ROLES as readonly string[]).includes(role)) {
        return NextResponse.redirect(new URL(getDashboardPath(role), request.url))
      }
    }
    return NextResponse.next()
  }

  // Protected path — no token → send to login
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin': return '/dashboard'
    case 'agent': return '/agent/dashboard'
    case 'owner': return '/owner/dashboard'
    default:      return '/login'
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
