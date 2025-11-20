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

    const where: any = { projectId }
    if (milestoneId) {
      where.milestoneId = milestoneId
    }

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

    return NextResponse.json({ communications })
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

