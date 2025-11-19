import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

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

    if (!file || file.project.userId !== user.userId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete file from filesystem
    try {
      const filePath = join(process.cwd(), file.fileUrl)
      await unlink(filePath)
    } catch (error) {
      console.error('Error deleting file from filesystem:', error)
      // Continue with database deletion even if file deletion fails
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

