import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

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

    if (!task || task.milestone.project.userId !== user.userId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify assigned user exists if provided
    if (body.assignedToId !== undefined) {
      if (body.assignedToId) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: body.assignedToId },
        })
        if (!assignedUser) {
          return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
        }
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
        ...(body.isImportant !== undefined && { isImportant: body.isImportant }),
        ...(body.status === 'COMPLETED' && !task.completedDate && {
          completedDate: new Date(),
        }),
        ...(body.status !== 'COMPLETED' && task.completedDate && {
          completedDate: null,
        }),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            provider: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                provider: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    if (!task || task.milestone.project.userId !== user.userId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


