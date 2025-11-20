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

    const milestone = await prisma.milestone.findFirst({
      where: { id: params.id },
      include: { project: true },
    })

    if (!milestone || milestone.project.userId !== user.userId) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const comments = await prisma.milestoneComment.findMany({
      where: { milestoneId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const milestone = await prisma.milestone.findFirst({
      where: { id: params.id },
      include: { project: true },
    })

    if (!milestone || milestone.project.userId !== user.userId) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    const comment = await prisma.milestoneComment.create({
      data: {
        content: content.trim(),
        milestoneId: params.id,
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
      },
    })

    return NextResponse.json({ comment })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

