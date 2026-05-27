import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/otp', '/pending']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('accessToken')?.value

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (accessToken) {
      const role = request.cookies.get('userRole')?.value
      const destination = getDashboardPath(role)
      return NextResponse.redirect(new URL(destination, request.url))
    }
    return NextResponse.next()
  }

  // If no token, redirect to login
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

function getDashboardPath(role?: string): string {
  switch (role) {
    case 'admin':
      return '/dashboard'
    case 'agent':
      return '/agent/dashboard'
    case 'owner':
      return '/owner/dashboard'
    default:
      return '/login'
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
