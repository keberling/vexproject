import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createGraphClient, getOrCreateBackupsFolder } from '@/lib/sharepoint'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// List backups from SharePoint (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, accessToken: true, provider: true },
    })

    if (dbUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Check if user has Microsoft SSO
    if (dbUser.provider !== 'microsoft' || !dbUser.accessToken) {
      return NextResponse.json(
        { error: 'Microsoft SSO required to access SharePoint backups' },
        { status: 400 }
      )
    }

    try {
      const client = createGraphClient(dbUser.accessToken)
      const siteId = process.env.SHAREPOINT_SITE_ID
      const driveId = process.env.SHAREPOINT_DRIVE_ID

      // Determine base path (must match getOrCreateBackupsFolder)
      let basePath: string
      if (siteId) {
        basePath = `/sites/${siteId}`
      } else {
        basePath = '/me'
      }

      console.log('SharePoint Backups: Base path:', basePath)
      console.log('SharePoint Backups: Site ID:', siteId || 'none (using /me)')

      // Verify the Backups folder exists (same function used for uploads)
      const backupsFolderId = await getOrCreateBackupsFolder(client, siteId, driveId)
      console.log('SharePoint Backups: Backups folder ID:', backupsFolderId)

      // List files in the Backups folder
      // For SharePoint, we'll try multiple approaches
      console.log('SharePoint Backups: Listing files in folder...')
      let filesResponse: any
      let files: any[] = []
      
      // Approach 1: Try to get folder details first, then list children
      try {
        const folderDetails = await client
          .api(`${basePath}/drive/items/${backupsFolderId}`)
          .get()
        console.log('SharePoint Backups: Folder details retrieved:', folderDetails.name)
        
        // Now try to list children using the folder's webUrl or a different method
        // Try using the folder ID with children endpoint
        filesResponse = await client
          .api(`${basePath}/drive/items/${backupsFolderId}/children`)
          .get()
        files = filesResponse.value || []
      } catch (error1: any) {
        console.log('SharePoint Backups: Approach 1 failed:', error1.code || error1.message)
        
        // Approach 2: Try using search to find backup files
        try {
          console.log('SharePoint Backups: Trying search approach...')
          const searchResponse = await client
            .api(`${basePath}/drive/root/search(q='vex-backup')`)
            .get()
          files = searchResponse.value || []
          console.log(`SharePoint Backups: Search found ${files.length} items`)
          
          // Filter to only files in the Backups folder
          files = files.filter((file: any) => {
            const parentPath = file.parentReference?.path || ''
            return parentPath.includes('/Backups') || parentPath.endsWith('/Backups')
          })
        } catch (error2: any) {
          console.log('SharePoint Backups: Search approach failed:', error2.code || error2.message)
          
          // Approach 3: Try path-based with different syntax
          try {
            filesResponse = await client
              .api(`${basePath}/drive/root:/Backups`)
              .expand('children')
              .get()
            files = filesResponse.children?.value || []
          } catch (error3: any) {
            console.error('SharePoint Backups: All approaches failed')
            throw new Error(`Failed to list backups: ${error1.message || error2.message || error3.message}`)
          }
        }
      }
      
      // Sort manually by date (newest first)
      if (files.length > 0) {
        files.sort((a: any, b: any) => {
          const dateA = new Date(a.createdDateTime || a.lastModifiedDateTime || 0).getTime()
          const dateB = new Date(b.createdDateTime || b.lastModifiedDateTime || 0).getTime()
          return dateB - dateA // Descending order (newest first)
        })
      }
      
      filesResponse = { value: files }

      console.log(`SharePoint Backups: Found ${filesResponse.value?.length || 0} items in folder`)

      // Log all files for debugging
      if (filesResponse.value && filesResponse.value.length > 0) {
        console.log('SharePoint Backups: Files found:', filesResponse.value.map((f: any) => ({
          name: f.name,
          size: f.size,
          isFolder: f.folder !== undefined,
        })))
      }

      const backups = (filesResponse.value || [])
        .filter((file: any) => {
          const isZip = file.name.endsWith('.zip')
          const isBackup = file.name.startsWith('vex-backup') || file.name.startsWith('vex-scheduled-backup')
          const isFile = !file.folder // Exclude folders
          return isZip && isBackup && isFile
        })
        .map((file: any) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          createdDateTime: file.createdDateTime,
          lastModifiedDateTime: file.lastModifiedDateTime,
          webUrl: file.webUrl,
          downloadUrl: file['@microsoft.graph.downloadUrl'] || file.webUrl,
        }))

      console.log(`SharePoint Backups: Filtered to ${backups.length} backup files`)

      return NextResponse.json({
        backups,
        count: backups.length,
      })
    } catch (error: any) {
      console.error('Error listing SharePoint backups:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { 
          error: 'Failed to list backups from SharePoint',
          details: error.message || String(error),
          code: error.code,
          statusCode: error.statusCode,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in sharepoint-backups route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

