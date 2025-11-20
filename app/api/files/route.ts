import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { createGraphClient, uploadFileToSharePoint } from '@/lib/sharepoint'
import sharp from 'sharp'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestoneId')
    const projectId = searchParams.get('projectId')

    if (milestoneId) {
      // Fetch files for a specific milestone
      const milestone = await prisma.milestone.findFirst({
        where: { id: milestoneId },
        include: { project: true },
      })

      if (!milestone || milestone.project.userId !== user.userId) {
        return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
      }

      const files = await prisma.projectFile.findMany({
        where: { milestoneId },
        orderBy: { uploadedAt: 'desc' },
      })

      return NextResponse.json({ files })
    }

    if (projectId) {
      // Fetch files for a project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.userId,
        },
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      const files = await prisma.projectFile.findMany({
        where: { projectId },
        include: {
          milestone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      })

      return NextResponse.json({ files })
    }

    return NextResponse.json({ error: 'projectId or milestoneId is required' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const milestoneId = formData.get('milestoneId') as string | null

    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'File and project ID are required' },
        { status: 400 }
      )
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.userId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Check if file is an image
    const isImage = file.type.startsWith('image/')
    let thumbnailUrl: string | null = null
    let thumbnailBuffer: Buffer | null = null

    // Generate thumbnail for images
    if (isImage) {
      try {
        thumbnailBuffer = await sharp(buffer)
          .resize(200, 200, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80 })
          .toBuffer()
      } catch (error) {
        console.error('Error generating thumbnail:', error)
        // Continue without thumbnail if generation fails
      }
    }

    // Get user to check for Microsoft access token - prioritize SharePoint
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { accessToken: true, provider: true },
    })

    let fileUrl: string
    let sharepointId: string | null = null
    let sharepointUrl: string | null = null

    // Try SharePoint first if user has Microsoft SSO and access token
    // SharePoint is the default storage method
    if (dbUser?.provider === 'microsoft' && dbUser.accessToken) {
      try {
        const client = createGraphClient(dbUser.accessToken)
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        
        // Upload to SharePoint - getOrCreateProjectFolder will create folders if needed
        const sharepointFile = await uploadFileToSharePoint(
          client,
          buffer,
          fileName,
          project.name,
          process.env.SHAREPOINT_SITE_ID,
          process.env.SHAREPOINT_DRIVE_ID
        )

        sharepointId = sharepointFile.id
        sharepointUrl = sharepointFile.webUrl
        fileUrl = sharepointFile.downloadUrl

        // Upload thumbnail to SharePoint if available
        if (thumbnailBuffer) {
          try {
            const thumbnailFileName = `thumb_${fileName.replace(/\.[^/.]+$/, '.jpg')}`
            const thumbnailFile = await uploadFileToSharePoint(
              client,
              thumbnailBuffer,
              thumbnailFileName,
              project.name,
              process.env.SHAREPOINT_SITE_ID,
              process.env.SHAREPOINT_DRIVE_ID
            )
            thumbnailUrl = thumbnailFile.downloadUrl
          } catch (error) {
            console.error('Error uploading thumbnail to SharePoint:', error)
            // Continue without thumbnail
          }
        }
      } catch (error) {
        console.error('SharePoint upload failed, falling back to local storage:', error)
        console.error('SharePoint error details:', JSON.stringify(error, null, 2))
        // Fall back to local storage if SharePoint fails
        const uploadsDir = join(process.cwd(), 'uploads', projectId)
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true })
        }

        const fileName = `${Date.now()}-${file.name}`
        const filePath = join(uploadsDir, fileName)
        await writeFile(filePath, buffer)
        fileUrl = `/uploads/${projectId}/${fileName}`

        // Save thumbnail locally if available
        if (thumbnailBuffer) {
          const thumbnailFileName = `thumb_${Date.now()}-${file.name.replace(/\.[^/.]+$/, '.jpg')}`
          const thumbnailPath = join(uploadsDir, thumbnailFileName)
          await writeFile(thumbnailPath, thumbnailBuffer)
          thumbnailUrl = `/uploads/${projectId}/${thumbnailFileName}`
        }
      }
    } else {
      // No Microsoft SSO or access token - use local filesystem as fallback
      console.warn('User does not have Microsoft SSO or access token. Using local storage.')
      const uploadsDir = join(process.cwd(), 'uploads', projectId)
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      const fileName = `${Date.now()}-${file.name}`
      const filePath = join(uploadsDir, fileName)
      await writeFile(filePath, buffer)
      fileUrl = `/uploads/${projectId}/${fileName}`

      // Save thumbnail locally if available
      if (thumbnailBuffer) {
        const thumbnailFileName = `thumb_${Date.now()}-${file.name.replace(/\.[^/.]+$/, '.jpg')}`
        const thumbnailPath = join(uploadsDir, thumbnailFileName)
        await writeFile(thumbnailPath, thumbnailBuffer)
        thumbnailUrl = `/uploads/${projectId}/${thumbnailFileName}`
      }
    }

    // If milestoneId is provided, verify it belongs to the project
    if (milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: {
          id: milestoneId,
          projectId,
        },
      })

      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found' },
          { status: 404 }
        )
      }
    }

    const projectFile = await prisma.projectFile.create({
      data: {
        name: file.name,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        thumbnailUrl: thumbnailUrl,
        projectId,
        milestoneId: milestoneId || null,
        sharepointId: sharepointId,
        sharepointUrl: sharepointUrl,
      },
    })

    return NextResponse.json({ file: projectFile })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

