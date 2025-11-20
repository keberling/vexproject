import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

/**
 * This endpoint handles the callback after Microsoft SSO
 * It creates/updates the user and sets a JWT token cookie
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.redirect(new URL('/?error=Unauthorized', request.url))
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      // This shouldn't happen if signIn callback worked, but handle it anyway
      return NextResponse.redirect(new URL('/?error=UserNotFound', request.url))
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

    const response = NextResponse.redirect(new URL('/dashboard', request.url))

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
    return NextResponse.redirect(new URL('/?error=AuthError', request.url))
  }
}

