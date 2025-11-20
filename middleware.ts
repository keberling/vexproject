import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Get the correct base URL for redirects
 * Handles reverse proxy scenarios and production environments
 */
function getBaseUrl(request: NextRequest): string {
  // Check for explicit AUTH_URL or NEXTAUTH_URL
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL
  if (authUrl) {
    return authUrl
  }

  // Check for forwarded headers (from reverse proxy)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  // Fall back to Host header
  const host = request.headers.get('host')
  if (host) {
    const protocol = request.headers.get('x-forwarded-proto') || 
                    (host.includes('localhost') ? 'http' : 'https')
    return `${protocol}://${host}`
  }

  // Last resort: use request URL but extract origin properly
  try {
    const url = new URL(request.url)
    return `${url.protocol}//${url.host}`
  } catch {
    // Final fallback
    return process.env.NODE_ENV === 'production' 
      ? 'https://project.vexitey.com'
      : 'http://localhost:3000'
  }
}

export function middleware(request: NextRequest) {
  // Allow public assets and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/uploads') ||
    request.nextUrl.pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Check for auth token in cookies for dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token')
    if (!token) {
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL('/', baseUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

