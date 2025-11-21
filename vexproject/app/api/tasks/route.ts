import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { milestoneId, name, description, dueDate, assignedToId, isImportant } = body

    if (!milestoneId || !name) {
      return NextResponse.json(
        { error: 'Milestone ID and name are required' },
        { status: 400 }
      )
    }

    // Verify milestone belongs to user's project
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
      },
      include: {
        project: true,
      },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Verify assigned user exists if provided
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      })
      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
      }
    }

    const task = await prisma.task.create({
      data: {
        name,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        milestoneId,
        assignedToId: assignedToId || null,
        isImportant: isImportant || false,
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

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


