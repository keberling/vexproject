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
    let importData: any

    // Handle both single template and multi-template imports
    if (body.templates) {
      // Multi-template import
      importData = body
    } else if (body.name && body.milestones) {
      // Single template import
      importData = { templates: [body] }
    } else {
      return NextResponse.json(
        { error: 'Invalid import format. Expected template object or templates array.' },
        { status: 400 }
      )
    }

    const importedTemplates = []

    for (const templateData of importData.templates) {
      const { name, description, milestones, isDefault } = templateData

      if (!name) {
        continue // Skip invalid templates
      }

      // Check if template with same name exists
      const existing = await prisma.projectTemplate.findFirst({
        where: { name },
      })

      if (existing) {
        // Update existing template
        // Delete existing milestones and tasks
        await prisma.templateTask.deleteMany({
          where: {
            templateMilestone: {
              templateId: existing.id,
            },
          },
        })
        await prisma.templateMilestone.deleteMany({
          where: { templateId: existing.id },
        })

        // If setting as default, unset other defaults
        if (isDefault) {
          await prisma.projectTemplate.updateMany({
            where: {
              isDefault: true,
              id: { not: existing.id },
            },
            data: { isDefault: false },
          })
        }

        const updatedTemplate = await prisma.projectTemplate.update({
          where: { id: existing.id },
          data: {
            name,
            description: description || null,
            isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
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

        importedTemplates.push(updatedTemplate)
      } else {
        // Create new template
        // If setting as default, unset other defaults
        if (isDefault) {
          await prisma.projectTemplate.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
          })
        }

        const newTemplate = await prisma.projectTemplate.create({
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

        importedTemplates.push(newTemplate)
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedTemplates.length,
      templates: importedTemplates,
    })
  } catch (error) {
    console.error('Error importing templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

