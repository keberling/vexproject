import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { createGraphClient, uploadFileToSharePoint } from '@/lib/sharepoint'
import sharp from 'sharp'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Verify task belongs to user's project
    const task = await prisma.task.findFirst({
      where: { id: params.id },
      include: {
        milestone: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${sanitizedName}`
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'tasks', params.id)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filePath = join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    // Generate thumbnail for images
    let thumbnailUrl: string | null = null
    if (file.type.startsWith('image/')) {
      try {
        const thumbnailPath = join(uploadsDir, `thumb-${fileName}`)
        await sharp(buffer)
          .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
          .toFile(thumbnailPath)
        thumbnailUrl = `/uploads/tasks/${params.id}/thumb-${fileName}`
      } catch (error) {
        console.error('Error generating thumbnail:', error)
      }
    }

    let fileUrl = `/uploads/tasks/${params.id}/${fileName}`

    // Try to upload to SharePoint if configured
    let sharepointId: string | null = null
    let sharepointUrl: string | null = null

    // Get user to check for Microsoft access token
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { accessToken: true, provider: true },
    })

    if (dbUser?.provider === 'microsoft' && dbUser.accessToken && process.env.SHAREPOINT_SITE_ID) {
      try {
        const client = createGraphClient(dbUser.accessToken)
        const sharepointResult = await uploadFileToSharePoint(
          client,
          buffer,
          fileName,
          `Task-${params.id}`,
          process.env.SHAREPOINT_SITE_ID,
          process.env.SHAREPOINT_DRIVE_ID
        )
        sharepointId = sharepointResult.id
        sharepointUrl = sharepointResult.webUrl
        fileUrl = sharepointResult.downloadUrl
      } catch (error) {
        console.error('Error uploading to SharePoint:', error)
        // Continue with local storage if SharePoint fails
      }
    }

    const taskFile = await prisma.taskFile.create({
      data: {
        name: file.name,
        fileName: fileName,
        fileUrl: sharepointUrl || fileUrl,
        fileType: file.type,
        fileSize: buffer.length,
        thumbnailUrl: thumbnailUrl,
        taskId: params.id,
        sharepointId: sharepointId,
        sharepointUrl: sharepointUrl,
      },
    })

    return NextResponse.json({ file: taskFile })
  } catch (error) {
    console.error('Error uploading task file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify task belongs to user's project
    const task = await prisma.task.findFirst({
      where: { id: params.id },
      include: {
        milestone: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const files = await prisma.taskFile.findMany({
      where: { taskId: params.id },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error fetching task files:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

