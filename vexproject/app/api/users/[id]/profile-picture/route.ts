import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

// Get user profile picture (for authenticated users)
// This proxies the Microsoft Graph API photo endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id

    // Get the user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        provider: true,
        accessToken: true,
        microsoftId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only fetch profile picture if user has Microsoft SSO
    if (user.provider === 'microsoft' && user.accessToken) {
      try {
        const client = Client.init({
          authProvider: (done) => {
            done(null, user.accessToken!)
          },
        })

        // Use microsoftId if available, otherwise use /me
        const endpoint = user.microsoftId 
          ? `/users/${user.microsoftId}/photo/$value`
          : `/me/photo/$value`

        try {
          // Check if photo exists first
          const metadataEndpoint = user.microsoftId
            ? `/users/${user.microsoftId}/photo`
            : `/me/photo`
          
          await client.api(metadataEndpoint).get()

          // If metadata exists, return the Graph API URL
          // The client will need to include the access token in the request
          // For now, we'll return a proxy URL that includes the token
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          return NextResponse.json({ 
            profilePictureUrl: `${baseUrl}/api/users/${userId}/profile-picture/image`,
            needsProxy: true,
          })
        } catch (metadataError: any) {
          // Photo doesn't exist
          return NextResponse.json({ profilePictureUrl: null })
        }
      } catch (error) {
        console.error('Error fetching profile picture:', error)
        return NextResponse.json({ profilePictureUrl: null })
      }
    }

    return NextResponse.json({ profilePictureUrl: null })
  } catch (error) {
    console.error('Error in profile picture route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

