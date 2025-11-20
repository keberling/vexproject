import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { createGraphClient, deleteFileFromSharePoint } from '@/lib/sharepoint'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const file = await prisma.projectFile.findFirst({
      where: { id: params.id },
      include: { project: true },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete file from SharePoint if it's stored there
    if (file.sharepointId) {
      try {
        // Get user's access token for SharePoint deletion
        const dbUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { accessToken: true, provider: true },
        })

        if (dbUser?.provider === 'microsoft' && dbUser.accessToken) {
          const client = createGraphClient(dbUser.accessToken)
          await deleteFileFromSharePoint(
            client,
            file.sharepointId,
            process.env.SHAREPOINT_SITE_ID
          )
          console.log(`Deleted file from SharePoint: ${file.sharepointId}`)
        } else {
          console.warn('File has sharepointId but user does not have Microsoft SSO or access token')
        }
      } catch (error) {
        console.error('Error deleting file from SharePoint:', error)
        // Continue with local file and database deletion even if SharePoint deletion fails
      }
    }

    // Delete file from local filesystem (if stored locally)
    if (file.fileUrl && !file.sharepointId && file.fileUrl.startsWith('/uploads/')) {
      try {
        const filePath = join(process.cwd(), file.fileUrl)
        await unlink(filePath)
        
        // Also delete thumbnail if it exists and is stored locally
        if (file.thumbnailUrl && file.thumbnailUrl.startsWith('/uploads/')) {
          const thumbnailPath = join(process.cwd(), file.thumbnailUrl)
          await unlink(thumbnailPath).catch(() => {
            // Ignore errors deleting thumbnails
          })
        }
      } catch (error) {
        console.error('Error deleting file from filesystem:', error)
        // Continue with database deletion even if file deletion fails
      }
    }

    await prisma.projectFile.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

