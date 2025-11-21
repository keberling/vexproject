import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

interface SharePointConfig {
  accessToken: string
  siteId?: string
  driveId?: string
}

/**
 * Get or create a SharePoint folder for backups
 * Files will be organized in: /Backups/
 */
export async function getOrCreateBackupsFolder(
  client: Client,
  siteId?: string,
  driveId?: string
): Promise<string> {
  try {
    const backupsFolder = 'Backups'

    // Determine base path - use siteId if provided, otherwise use default OneDrive
    let basePath: string
    if (siteId) {
      basePath = `/sites/${siteId}`
    } else {
      // Use default OneDrive for Business (user's personal OneDrive)
      basePath = '/me'
    }

    // Try to get or create the Backups folder
    try {
      // First, try to find the Backups folder (might be named "Backups" or "Backups 1", etc. due to conflicts)
      // List all folders in root and find one that starts with "Backups"
      const rootChildren = await client
        .api(`${basePath}/drive/root/children`)
        .filter("folder ne null")
        .get()
      
      const backupsFolderItem = rootChildren.value.find((item: any) => 
        item.name.startsWith(backupsFolder) && item.folder !== undefined
      )
      
      if (backupsFolderItem) {
        console.log(`Backups folder found: "${backupsFolderItem.name}" (ID: ${backupsFolderItem.id})`)
        return backupsFolderItem.id
      }
      
      // If not found, try the exact name
      const backupsFolderResponse = await client
        .api(`${basePath}/drive/root:/${backupsFolder}`)
        .get()
      
      console.log(`Backups folder found: "${backupsFolder}" (ID: ${backupsFolderResponse.id})`)
      return backupsFolderResponse.id
    } catch (error: any) {
      // Backups folder doesn't exist, create it
      if (error.statusCode === 404 || error.code === 'itemNotFound') {
        try {
          console.log(`Creating Backups folder: "${backupsFolder}"`)
          const createResponse = await client
            .api(`${basePath}/drive/root/children`)
            .post({
              name: backupsFolder,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'fail', // Fail if exists, we'll handle it above
            })
          console.log(`Backups folder created: "${backupsFolder}" (ID: ${createResponse.id})`)
          return createResponse.id
        } catch (createError: any) {
          // If conflict, try to find it again
          if (createError.code === 'nameAlreadyExists' || createError.statusCode === 409) {
            console.log('Backups folder already exists, finding it...')
            const rootChildren = await client
              .api(`${basePath}/drive/root/children`)
              .filter("folder ne null")
              .get()
            
            const backupsFolderItem = rootChildren.value.find((item: any) => 
              item.name.startsWith(backupsFolder) && item.folder !== undefined
            )
            
            if (backupsFolderItem) {
              console.log(`Found existing Backups folder: "${backupsFolderItem.name}" (ID: ${backupsFolderItem.id})`)
              return backupsFolderItem.id
            }
          }
          console.error('Error creating Backups folder:', createError)
          throw createError
        }
      } else {
        console.error('Error accessing Backups folder:', error)
        throw error
      }
    }
  } catch (error) {
    console.error('Error getting/creating Backups folder:', error)
    throw error
  }
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
    // Sanitize project name for folder name (remove invalid characters)
    const folderName = projectName.replace(/[^a-zA-Z0-9-_ ]/g, '_').trim().replace(/\s+/g, '_')
    const projectsFolder = 'Projects'

    // Determine base path - use siteId if provided, otherwise use default OneDrive
    let basePath: string
    if (siteId) {
      basePath = `/sites/${siteId}`
    } else {
      // Use default OneDrive for Business (user's personal OneDrive)
      basePath = '/me'
    }

    // Try to get or create the Projects folder first
    let projectsFolderId: string
    try {
      const projectsFolderResponse = await client
        .api(`${basePath}/drive/root:/${projectsFolder}`)
        .get()
      
      projectsFolderId = projectsFolderResponse.id
    } catch (error: any) {
      // Projects folder doesn't exist, create it
      if (error.statusCode === 404 || error.code === 'itemNotFound') {
        try {
          const createResponse = await client
            .api(`${basePath}/drive/root/children`)
            .post({
              name: projectsFolder,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename',
            })
          projectsFolderId = createResponse.id
        } catch (createError: any) {
          console.error('Error creating Projects folder:', createError)
          throw createError
        }
      } else {
        console.error('Error accessing Projects folder:', error)
        throw error
      }
    }

    // Try to get or create the project-specific folder
    try {
      const projectFolderResponse = await client
        .api(`${basePath}/drive/items/${projectsFolderId}:/${folderName}`)
        .get()
      
      return projectFolderResponse.id
    } catch (error: any) {
      // Project folder doesn't exist, create it
      if (error.statusCode === 404 || error.code === 'itemNotFound') {
        try {
          const createResponse = await client
            .api(`${basePath}/drive/items/${projectsFolderId}/children`)
            .post({
              name: folderName,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename',
            })
          return createResponse.id
        } catch (createError: any) {
          console.error('Error creating project folder:', createError)
          throw createError
        }
      } else {
        console.error('Error accessing project folder:', error)
        throw error
      }
    }
  } catch (error) {
    console.error('Error getting/creating project folder:', error)
    throw error
  }
}

/**
 * Upload a backup file to SharePoint in the Backups folder
 */
export async function uploadBackupToSharePoint(
  client: Client,
  file: Buffer,
  fileName: string,
  siteId?: string,
  driveId?: string
): Promise<{ id: string; webUrl: string; downloadUrl: string }> {
  try {
    // Determine base path - use siteId if provided, otherwise use default OneDrive
    let basePath: string
    if (siteId) {
      basePath = `/sites/${siteId}`
    } else {
      // Use default OneDrive for Business (user's personal OneDrive)
      basePath = '/me'
    }

    console.log('Upload Backup: Base path:', basePath)
    console.log('Upload Backup: Site ID:', siteId || 'none (using /me)')
    console.log('Upload Backup: File name:', fileName)

    // Get or create the Backups folder
    const folderId = await getOrCreateBackupsFolder(client, siteId, driveId)
    console.log('Upload Backup: Backups folder ID:', folderId)

    // Upload the file to the Backups folder
    const uploadResponse = await client
      .api(`${basePath}/drive/items/${folderId}:/${fileName}:/content`)
      .put(file)

    console.log('Upload Backup: File uploaded, ID:', uploadResponse.id)

    // Get the file details including web URL
    const fileDetails = await client
      .api(`${basePath}/drive/items/${uploadResponse.id}`)
      .get()

    console.log('Upload Backup: File saved at:', fileDetails.webUrl)
    console.log('Upload Backup: File parent path:', fileDetails.parentReference?.path)

    return {
      id: uploadResponse.id,
      webUrl: fileDetails.webUrl,
      downloadUrl: fileDetails['@microsoft.graph.downloadUrl'] || fileDetails.webUrl,
    }
  } catch (error) {
    console.error('Error uploading backup to SharePoint:', error)
    console.error('Upload error details:', JSON.stringify(error, null, 2))
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
    // Get or create the project folder (this will create folders if they don't exist)
    const folderId = await getOrCreateProjectFolder(client, projectName, siteId, driveId)

    // Determine base path - use siteId if provided, otherwise use default OneDrive
    let basePath: string
    if (siteId) {
      basePath = `/sites/${siteId}`
    } else {
      // Use default OneDrive for Business (user's personal OneDrive)
      basePath = '/me'
    }

    // Upload the file to the project folder
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
    console.error('Upload error details:', JSON.stringify(error, null, 2))
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
    // Determine base path - use siteId if provided, otherwise use default OneDrive
    let basePath: string
    if (siteId) {
      basePath = `/sites/${siteId}`
    } else {
      // Use default OneDrive for Business (user's personal OneDrive)
      basePath = '/me'
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
