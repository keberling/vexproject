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
    const templateId = searchParams.get('id')

    if (templateId) {
      // Export single template
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

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      // Format for export (remove internal IDs)
      const exportData = {
        name: template.name,
        description: template.description,
        isDefault: template.isDefault,
        milestones: template.templateMilestones.map(m => ({
          name: m.name,
          description: m.description,
          category: m.category,
          order: m.order,
          tasks: m.tasks.map(t => ({
            name: t.name,
            description: t.description,
            order: t.order,
          })),
        })),
      }

      return NextResponse.json(exportData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.json"`,
        },
      })
    } else {
      // Export all templates
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
        orderBy: { name: 'asc' },
      })

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        templates: templates.map(template => ({
          name: template.name,
          description: template.description,
          isDefault: template.isDefault,
          milestones: template.templateMilestones.map(m => ({
            name: m.name,
            description: m.description,
            category: m.category,
            order: m.order,
            tasks: m.tasks.map(t => ({
              name: t.name,
              description: t.description,
              order: t.order,
            })),
          })),
        })),
      }

      return NextResponse.json(exportData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="templates_export.json"',
        },
      })
    }
  } catch (error) {
    console.error('Error exporting templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

