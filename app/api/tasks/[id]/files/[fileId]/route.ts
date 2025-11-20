import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
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

    // Verify file exists and belongs to task
    const file = await prisma.taskFile.findFirst({
      where: {
        id: params.fileId,
        taskId: params.id,
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    await prisma.taskFile.delete({
      where: { id: params.fileId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

