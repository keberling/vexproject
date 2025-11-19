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
    const { name, location, address, city, state, zipCode, description, templateId } = body

    if (!name || !location) {
      return NextResponse.json(
        { error: 'Name and location are required' },
        { status: 400 }
      )
    }

    // If template is provided, fetch it to create milestones
    let templateMilestones: any[] = []
    if (templateId) {
      const template = await prisma.projectTemplate.findUnique({
        where: { id: templateId },
        include: {
          templateMilestones: {
            orderBy: { order: 'asc' },
          },
        },
      })

      if (template) {
        templateMilestones = template.templateMilestones.map((tm) => ({
          name: tm.name,
          description: tm.description,
          status: 'PENDING',
        }))
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        location,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        description: description || null,
        templateId: templateId || null,
        userId: user.userId,
        milestones: {
          create: templateMilestones,
        },
      },
      include: {
        milestones: true,
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

