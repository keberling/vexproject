import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.userId,
      },
      include: {
        milestones: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch all communications for the project
    const communications = await prisma.communication.findMany({
      where: { projectId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            provider: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch all milestone comments for milestones in this project
    const milestoneComments = await prisma.milestoneComment.findMany({
      where: {
        milestone: {
          projectId: params.id,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            provider: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Combine and format all notes/communications
    const allItems = [
      ...communications.map(comm => ({
        id: comm.id,
        type: comm.type,
        subject: comm.subject,
        content: comm.content,
        direction: comm.direction,
        createdAt: comm.createdAt,
        user: comm.user,
        milestone: comm.milestone,
        source: 'communication' as const,
      })),
      ...milestoneComments.map(comment => ({
        id: comment.id,
        type: 'NOTE' as const,
        subject: null,
        content: comment.content,
        direction: null,
        createdAt: comment.createdAt,
        user: comment.user,
        milestone: {
          id: comment.milestone.id,
          name: comment.milestone.name,
        },
        source: 'milestone_comment' as const,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ items: allItems })
  } catch (error) {
    console.error('Error fetching all communications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

