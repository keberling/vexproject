import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Delete auth-token cookie
    cookieStore.delete('auth-token')
    
    // Also try to delete any NextAuth session cookies if they exist
    const allCookies = cookieStore.getAll()
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('next-auth') || cookie.name.startsWith('__Secure-next-auth')) {
        cookieStore.delete(cookie.name)
      }
    })

    const response = NextResponse.json({ success: true })
    
    // Also set cookies in response to ensure they're deleted on client
    response.cookies.delete('auth-token')
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    const response = NextResponse.json({ success: true })
    response.cookies.delete('auth-token')
    return response
  }
}

