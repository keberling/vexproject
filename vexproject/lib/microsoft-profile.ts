import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

/**
 * Get user profile picture from Microsoft Graph API
 */
export async function getUserProfilePicture(
  accessToken: string,
  userId?: string
): Promise<string | null> {
  try {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      },
    })

    // Use /me if no userId provided, otherwise use /users/{userId}
    const endpoint = userId ? `/users/${userId}/photo/$value` : `/me/photo/$value`
    
    try {
      const photoResponse = await client.api(endpoint).get()
      
      // If we get binary data, convert to data URL
      if (photoResponse instanceof Blob || Buffer.isBuffer(photoResponse)) {
        const arrayBuffer = await (photoResponse as Blob).arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        return `data:image/jpeg;base64,${base64}`
      }
      
      return null
    } catch (error: any) {
      // If photo doesn't exist, try to get the photo metadata first
      if (error.statusCode === 404) {
        try {
          const metadataEndpoint = userId ? `/users/${userId}/photo` : `/me/photo`
          const metadata = await client.api(metadataEndpoint).get()
          
          if (metadata && metadata['@odata.mediaContentType']) {
            // Try to get the actual photo
            const photoResponse = await client.api(endpoint).get()
            if (photoResponse instanceof Blob || Buffer.isBuffer(photoResponse)) {
              const arrayBuffer = await (photoResponse as Blob).arrayBuffer()
              const base64 = Buffer.from(arrayBuffer).toString('base64')
              return `data:image/jpeg;base64,${base64}`
            }
          }
        } catch (metadataError) {
          // Photo doesn't exist, return null
          return null
        }
      }
      return null
    }
  } catch (error) {
    console.error('Error fetching user profile picture:', error)
    return null
  }
}

/**
 * Get user profile picture URL (for direct image src)
 * This is more efficient than base64 encoding
 */
export async function getUserProfilePictureUrl(
  accessToken: string,
  userId?: string
): Promise<string | null> {
  try {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      },
    })

    // Use /me if no userId provided, otherwise use /users/{userId}
    const endpoint = userId ? `/users/${userId}/photo/$value` : `/me/photo/$value`
    
    try {
      // Check if photo exists
      const metadataEndpoint = userId ? `/users/${userId}/photo` : `/me/photo`
      await client.api(metadataEndpoint).get()
      
      // If metadata exists, construct the URL
      // For Microsoft Graph, we can use the photo endpoint directly
      const baseUrl = 'https://graph.microsoft.com/v1.0'
      return `${baseUrl}${endpoint}`
    } catch (error: any) {
      // Photo doesn't exist
      return null
    }
  } catch (error) {
    console.error('Error getting user profile picture URL:', error)
    return null
  }
}

