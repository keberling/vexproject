import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

// Proxy the actual image from Microsoft Graph
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return new NextResponse(null, { status: 401 })
    }

    const userId = params.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        provider: true,
        accessToken: true,
        microsoftId: true,
      },
    })

    if (!user || user.provider !== 'microsoft' || !user.accessToken) {
      return new NextResponse(null, { status: 404 })
    }

    const client = Client.init({
      authProvider: (done) => {
        done(null, user.accessToken!)
      },
    })

    const endpoint = user.microsoftId 
      ? `/users/${user.microsoftId}/photo/$value`
      : `/me/photo/$value`

    try {
      const photoData = await client.api(endpoint).get()

      // Handle different response types
      let imageBuffer: Buffer
      if (Buffer.isBuffer(photoData)) {
        imageBuffer = photoData
      } else if (photoData instanceof ArrayBuffer) {
        imageBuffer = Buffer.from(photoData)
      } else if (photoData instanceof Blob) {
        const arrayBuffer = await photoData.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuffer)
      } else {
        // Try to convert to buffer
        imageBuffer = Buffer.from(photoData as any)
      }

      // Return the image with proper headers
      return new NextResponse(imageBuffer as any, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch (photoError: any) {
      // Photo doesn't exist or error fetching
      if (photoError.statusCode === 404) {
        return new NextResponse(null, { status: 404 })
      }
      throw photoError
    }
  } catch (error) {
    console.error('Error proxying profile picture:', error)
    return new NextResponse(null, { status: 500 })
  }
}

