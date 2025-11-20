import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

interface SharePointConfig {
  accessToken: string
  siteId?: string
  driveId?: string
}

/**
 * Get or create a SharePoint folder for a project
 * Files will be organized in: /Projects/{projectName}/
 */
export async function getOrCreateProjectFolder(
  client: Client,
  projectName: string,
  siteId?: string,
  driveId?: string
): Promise<string> {
  try {
    // Sanitize project name for folder name
    const folderName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_')
    const projectsFolder = 'Projects'
    const projectFolderPath = `${projectsFolder}/${folderName}`

    // If siteId and driveId are provided, use them
    // Otherwise, use the default SharePoint site
    let basePath = '/sites'
    if (siteId) {
      basePath = `/sites/${siteId}`
    }

    // Try to get the Projects folder first
    let projectsFolderId: string
    try {
      const projectsFolderResponse = await client
        .api(`${basePath}/drive/root:/${projectsFolder}`)
        .get()
      
      projectsFolderId = projectsFolderResponse.id
    } catch (error: any) {
      // Projects folder doesn't exist, create it
      if (error.statusCode === 404) {
        const createResponse = await client
          .api(`${basePath}/drive/root/children`)
          .post({
            name: projectsFolder,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          })
        projectsFolderId = createResponse.id
      } else {
        throw error
      }
    }

    // Try to get the project folder
    try {
      const projectFolderResponse = await client
        .api(`${basePath}/drive/items/${projectsFolderId}:/${folderName}`)
        .get()
      
      return projectFolderResponse.id
    } catch (error: any) {
      // Project folder doesn't exist, create it
      if (error.statusCode === 404) {
        const createResponse = await client
          .api(`${basePath}/drive/items/${projectsFolderId}/children`)
          .post({
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          })
        return createResponse.id
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error('Error getting/creating project folder:', error)
    throw error
  }
}

/**
 * Upload a file to SharePoint in the project's folder
 */
export async function uploadFileToSharePoint(
  client: Client,
  file: Buffer,
  fileName: string,
  projectName: string,
  siteId?: string,
  driveId?: string
): Promise<{ id: string; webUrl: string; downloadUrl: string }> {
  try {
    // Get or create the project folder
    const folderId = await getOrCreateProjectFolder(client, projectName, siteId, driveId)

    // Determine base path
    let basePath = '/sites'
    if (siteId) {
      basePath = `/sites/${siteId}`
    }

    // Upload the file
    const uploadResponse = await client
      .api(`${basePath}/drive/items/${folderId}:/${fileName}:/content`)
      .put(file)

    // Get the file details including web URL
    const fileDetails = await client
      .api(`${basePath}/drive/items/${uploadResponse.id}`)
      .get()

    return {
      id: uploadResponse.id,
      webUrl: fileDetails.webUrl,
      downloadUrl: fileDetails['@microsoft.graph.downloadUrl'] || fileDetails.webUrl,
    }
  } catch (error) {
    console.error('Error uploading file to SharePoint:', error)
    throw error
  }
}

/**
 * Delete a file from SharePoint
 */
export async function deleteFileFromSharePoint(
  client: Client,
  fileId: string,
  siteId?: string
): Promise<void> {
  try {
    let basePath = '/sites'
    if (siteId) {
      basePath = `/sites/${siteId}`
    }

    await client
      .api(`${basePath}/drive/items/${fileId}`)
      .delete()
  } catch (error) {
    console.error('Error deleting file from SharePoint:', error)
    throw error
  }
}

/**
 * Get a download URL for a SharePoint file
 */
export async function getSharePointFileUrl(
  client: Client,
  fileId: string,
  siteId?: string
): Promise<string> {
  try {
    let basePath = '/sites'
    if (siteId) {
      basePath = `/sites/${siteId}`
    }

    const fileDetails = await client
      .api(`${basePath}/drive/items/${fileId}`)
      .get()

    return fileDetails['@microsoft.graph.downloadUrl'] || fileDetails.webUrl
  } catch (error) {
    console.error('Error getting SharePoint file URL:', error)
    throw error
  }
}

/**
 * Create a Microsoft Graph client with the provided access token
 */
export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    },
  })
}
