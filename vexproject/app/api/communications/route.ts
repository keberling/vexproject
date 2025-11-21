import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const milestoneId = searchParams.get('milestoneId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project exists
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build where clause - if milestoneId is provided, filter by it; otherwise get all for project
    const where: any = { projectId }
    if (milestoneId) {
      where.milestoneId = milestoneId
    }
    // If no milestoneId filter, we want all communications (both with and without milestoneId)

    const communications = await prisma.communication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Ensure milestone relation is properly structured
    const communicationsWithMilestone = communications.map(comm => {
      // If milestoneId exists but milestone relation is null, it means the milestone was deleted
      // We'll still include it but with milestone as null
      return {
        ...comm,
        milestone: comm.milestoneId && comm.milestone ? comm.milestone : null,
      }
    })

    // Debug logging
    console.log(`[Communications API] Fetched ${communications.length} communications for project ${projectId}`)
    const milestoneComms = communicationsWithMilestone.filter(c => c.milestoneId)
    console.log(`[Communications API] ${milestoneComms.length} are milestone-related`)
    if (milestoneComms.length > 0) {
      console.log(`[Communications API] Sample milestone comm:`, {
        id: milestoneComms[0].id,
        type: milestoneComms[0].type,
        milestoneId: milestoneComms[0].milestoneId,
        milestone: milestoneComms[0].milestone
      })
    }

    return NextResponse.json({ communications: communicationsWithMilestone })
  } catch (error) {
    console.error('Error fetching communications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, subject, content, direction, projectId, milestoneId } = body

    if (!type || !content || !projectId) {
      return NextResponse.json(
        { error: 'Type, content, and project ID are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // If milestoneId is provided, verify it belongs to the project
    if (milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: {
          id: milestoneId,
          projectId,
        },
      })

      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found' },
          { status: 404 }
        )
      }
    }

    const communication = await prisma.communication.create({
      data: {
        type,
        subject: subject || null,
        content: content.trim(),
        direction: direction || null,
        projectId,
        milestoneId: milestoneId || null,
        userId: user.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ communication })
  } catch (error) {
    console.error('Error creating communication:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

