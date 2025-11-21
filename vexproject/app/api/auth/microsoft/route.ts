import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

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

/**
 * This endpoint handles the callback after Microsoft SSO
 * It creates/updates the user and sets a JWT token cookie
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL('/?error=Unauthorized', baseUrl))
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      // This shouldn't happen if signIn callback worked, but handle it anyway
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL('/?error=UserNotFound', baseUrl))
    }

    // Generate JWT token for our app
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    // Update user's access token if we have it from session
    if (session.accessToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accessToken: session.accessToken as string,
        },
      })
    }

    const baseUrl = getBaseUrl(request)
    const response = NextResponse.redirect(new URL('/dashboard', baseUrl))

    // Set our app's auth cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Microsoft auth callback error:', error)
    const baseUrl = getBaseUrl(request)
    return NextResponse.redirect(new URL('/?error=AuthError', baseUrl))
  }
}

