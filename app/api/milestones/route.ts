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
    const { projectId, name, description, dueDate } = body

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
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

    const milestone = await prisma.milestone.create({
      data: {
        name,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
      },
    })

    return NextResponse.json({ milestone })
  } catch (error) {
    console.error('Error creating milestone:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

