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
    const { 
      name, 
      address, 
      description,
      jobTypeId,
      packageId,
      gcContactName, 
      gcContactEmail, 
      cdsContactName, 
      cdsContactEmail, 
      franchiseOwnerContactName, 
      franchiseOwnerContactEmail, 
      templateId 
    } = body

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
              assignedToId: tt.assignedToId || null,
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
        jobTypeId: jobTypeId || null,
        gcContactName: gcContactName || null,
        gcContactEmail: gcContactEmail || null,
        cdsContactName: cdsContactName || null,
        cdsContactEmail: cdsContactEmail || null,
        franchiseOwnerContactName: franchiseOwnerContactName || null,
        franchiseOwnerContactEmail: franchiseOwnerContactEmail || null,
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

    // If package is provided, find or create inventory milestone and apply package
    if (packageId) {
      try {
        // Find or create an "Inventory" milestone
        let inventoryMilestone = project.milestones.find(
          (m) => m.name.toLowerCase().includes('inventory')
        )

        if (!inventoryMilestone) {
          inventoryMilestone = await prisma.milestone.create({
            data: {
              name: 'Inventory',
              description: 'Project inventory and equipment',
              projectId: project.id,
              status: 'PENDING',
            },
          })
        }

        // Get package with items
        const packageData = await prisma.inventoryPackage.findUnique({
          where: { id: packageId },
          include: {
            items: {
              include: {
                inventoryItem: true,
              },
            },
          },
        })

        if (packageData) {
          // Create assignments for each item in package
          for (const packageItem of packageData.items) {
            const item = packageItem.inventoryItem

            // Check availability
            if (item.trackSerialNumbers) {
              // For serial number items, get available units
              const units = await prisma.inventoryUnit.findMany({
                where: {
                  inventoryItemId: item.id,
                  status: 'AVAILABLE',
                },
                take: packageItem.quantity,
              })

              if (units.length < packageItem.quantity) {
                console.warn(
                  `Insufficient units for ${item.name}. Available: ${units.length}, Required: ${packageItem.quantity}`
                )
                continue
              }

              for (const unit of units) {
                await prisma.inventoryAssignment.create({
                  data: {
                    inventoryItemId: item.id,
                    inventoryUnitId: unit.id,
                    milestoneId: inventoryMilestone.id,
                    quantity: 1,
                    status: 'ASSIGNED',
                  },
                })

                await prisma.inventoryUnit.update({
                  where: { id: unit.id },
                  data: { status: 'ASSIGNED' },
                })
              }
            } else {
              // Bulk assignment
              const assignedQuantity = await prisma.inventoryAssignment.aggregate({
                where: {
                  inventoryItemId: item.id,
                  status: { in: ['ASSIGNED', 'USED'] },
                  inventoryUnitId: null,
                },
                _sum: {
                  quantity: true,
                },
              })

              const assigned = assignedQuantity._sum.quantity || 0
              const available = item.quantity - assigned

              if (available < packageItem.quantity) {
                console.warn(
                  `Insufficient inventory for ${item.name}. Available: ${available}, Required: ${packageItem.quantity}`
                )
                continue
              }

              await prisma.inventoryAssignment.create({
                data: {
                  inventoryItemId: item.id,
                  milestoneId: inventoryMilestone.id,
                  quantity: packageItem.quantity,
                  status: 'ASSIGNED',
                },
              })
            }
          }
        }
      } catch (error) {
        console.error('Error applying package to project:', error)
        // Don't fail project creation if package application fails
      }
    }

    // Fetch updated project with all relations
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        milestones: {
          include: {
            tasks: true,
          },
        },
        jobType: true,
      },
    })

    return NextResponse.json({ project: updatedProject || project })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

