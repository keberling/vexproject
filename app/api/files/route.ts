import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

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

    // TODO: SharePoint integration would go here
    // For now, save to local filesystem
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = join(process.cwd(), 'uploads', projectId)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const fileName = `${Date.now()}-${file.name}`
    const filePath = join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/${projectId}/${fileName}`

    const projectFile = await prisma.projectFile.create({
      data: {
        name: file.name,
        fileName,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        projectId,
        // SharePoint fields would be set here when integration is enabled
        // sharepointId: sharepointFile.id,
        // sharepointUrl: sharepointFile.webUrl,
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

