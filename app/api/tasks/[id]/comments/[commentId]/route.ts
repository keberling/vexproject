import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
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

    // Verify comment exists and belongs to task
    const comment = await prisma.taskComment.findFirst({
      where: {
        id: params.commentId,
        taskId: params.id,
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    await prisma.taskComment.delete({
      where: { id: params.commentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task comment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


