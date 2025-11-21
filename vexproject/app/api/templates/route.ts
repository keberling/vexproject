import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = await prisma.projectTemplate.findMany({
      include: {
        templateMilestones: {
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
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
    const { name, description, milestones, isDefault } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.projectTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const template = await prisma.projectTemplate.create({
      data: {
        name,
        description: description || null,
        isDefault: isDefault || false,
        templateMilestones: {
          create: (milestones || []).map((milestone: any, index: number) => ({
            name: milestone.name,
            description: milestone.description || null,
            category: milestone.category || null,
            order: milestone.order !== undefined ? milestone.order : index,
            tasks: {
              create: (milestone.tasks || []).map((task: any, taskIndex: number) => ({
                name: task.name,
                description: task.description || null,
                assignedToId: task.assignedToId || null,
                order: task.order !== undefined ? task.order : taskIndex,
              })),
            },
          })),
        },
      },
      include: {
        templateMilestones: {
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

