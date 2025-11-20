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

    // Verify milestone belongs to user's project
    const milestone = await prisma.milestone.findFirst({
      where: { id: params.id },
      include: { project: true },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Track status change if status is being updated
    if (body.status && body.status !== milestone.status) {
      await prisma.statusChange.create({
        data: {
          entityType: 'MILESTONE',
          entityId: params.id,
          oldStatus: milestone.status,
          newStatus: body.status,
          projectId: milestone.projectId,
          milestoneId: params.id,
          userId: user.userId,
        },
      })
    }

    const updatedMilestone = await prisma.milestone.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category !== undefined && { category: body.category || null }),
        ...(body.status && { status: body.status }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.isImportant !== undefined && { isImportant: body.isImportant }),
        ...(body.status === 'COMPLETED' && !milestone.completedDate && {
          completedDate: new Date(),
        }),
        ...(body.status !== 'COMPLETED' && milestone.completedDate && {
          completedDate: null,
        }),
      },
    })

    return NextResponse.json({ milestone: updatedMilestone })
  } catch (error) {
    console.error('Error updating milestone:', error)
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

    // Verify milestone belongs to user's project
    const milestone = await prisma.milestone.findFirst({
      where: { id: params.id },
      include: { project: true },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    await prisma.milestone.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting milestone:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

