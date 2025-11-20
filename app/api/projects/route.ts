import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.userId },
      include: {
        milestones: true,
        _count: {
          select: { files: true, calendarEvents: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
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
    const { name, address, description, gcContact, cdsContact, franchiseOwnerContact, templateId } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // If template is provided, fetch it to create milestones and tasks
    let templateMilestones: any[] = []
    if (templateId) {
      const template = await prisma.projectTemplate.findUnique({
        where: { id: templateId },
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

      if (template) {
        templateMilestones = template.templateMilestones.map((tm) => ({
          name: tm.name,
          description: tm.description,
          category: tm.category,
          status: 'PENDING',
          tasks: {
            create: tm.tasks.map((tt) => ({
              name: tt.name,
              description: tt.description,
              status: 'PENDING',
            })),
          },
        }))
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        address: address || null,
        description: description || null,
        gcContact: gcContact || null,
        cdsContact: cdsContact || null,
        franchiseOwnerContact: franchiseOwnerContact || null,
        templateId: templateId || null,
        userId: user.userId,
        milestones: {
          create: templateMilestones,
        },
      },
      include: {
        milestones: {
          include: {
            tasks: true,
          },
        },
      },
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

