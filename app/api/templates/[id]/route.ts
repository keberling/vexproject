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

    const template = await prisma.projectTemplate.findUnique({
      where: { id: params.id },
      include: {
        templateMilestones: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.projectTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
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
        where: { 
          isDefault: true,
          id: { not: params.id }
        },
        data: { isDefault: false },
      })
    }

    // Delete existing milestones and create new ones
    await prisma.templateMilestone.deleteMany({
      where: { templateId: params.id },
    })

    const updatedTemplate = await prisma.projectTemplate.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
        isDefault: isDefault !== undefined ? isDefault : template.isDefault,
        templateMilestones: {
          create: (milestones || []).map((milestone: any, index: number) => ({
            name: milestone.name,
            description: milestone.description || null,
            order: milestone.order !== undefined ? milestone.order : index,
          })),
        },
      },
      include: {
        templateMilestones: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({ template: updatedTemplate })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.projectTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Don't allow deleting default template
    if (template.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default template' },
        { status: 400 }
      )
    }

    await prisma.projectTemplate.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

