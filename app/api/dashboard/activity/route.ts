import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all user's projects
    const projects = await prisma.project.findMany({
      where: { userId: user.userId },
      select: { id: true },
    })

    const projectIds = projects.map(p => p.id)

    if (projectIds.length === 0) {
      return NextResponse.json({ 
        communications: [],
        milestoneComments: [],
      })
    }

    // Fetch all communications
    const communications = await prisma.communication.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            provider: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
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
      take: 20, // Fetch more to ensure we have enough after combining
    })

    // Fetch all milestone comments
    const milestoneComments = await prisma.milestoneComment.findMany({
      where: {
        milestone: {
          projectId: { in: projectIds },
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
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Fetch more to ensure we have enough after combining
    })

    // Fetch all status changes
    const statusChanges = await prisma.statusChange.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            provider: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
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
      take: 20, // Fetch more to ensure we have enough after combining
    })

    // Combine and sort by date
    const allItems = [
      ...communications.map(comm => ({
        id: comm.id,
        type: 'communication' as const,
        communicationType: comm.type,
        subject: comm.subject,
        content: comm.content,
        direction: comm.direction,
        createdAt: comm.createdAt,
        user: comm.user,
        project: comm.project,
        milestone: comm.milestone,
      })),
      ...milestoneComments.map(comment => ({
        id: comment.id,
        type: 'milestone_comment' as const,
        communicationType: 'NOTE' as const,
        subject: null,
        content: comment.content,
        direction: null,
        createdAt: comment.createdAt,
        user: comment.user,
        project: comment.milestone.project,
        milestone: {
          id: comment.milestone.id,
          name: comment.milestone.name,
        },
      })),
      ...statusChanges.map(change => ({
        id: change.id,
        type: 'status_change' as const,
        entityType: change.entityType,
        oldStatus: change.oldStatus,
        newStatus: change.newStatus,
        createdAt: change.createdAt,
        user: change.user,
        project: change.project,
        milestone: change.milestone,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10) // Take top 10 most recent

    return NextResponse.json({ items: allItems })
  } catch (error) {
    console.error('Error fetching dashboard activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

