import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Apply package to a milestone (assign all items in package)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { milestoneId } = body

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    // Get package with items
    const packageData = await prisma.inventoryPackage.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    })

    if (!packageData) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Verify milestone exists
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Create assignments for each item in package
    const assignments = []
    for (const packageItem of packageData.items) {
      const item = packageItem.inventoryItem

      // Check availability
      if (item.trackSerialNumbers) {
        // For serial number items, check available units
        const availableUnits = await prisma.inventoryUnit.count({
          where: {
            inventoryItemId: item.id,
            status: 'AVAILABLE',
          },
        })

        if (availableUnits < packageItem.quantity) {
          return NextResponse.json(
            {
              error: `Insufficient units for ${item.name}. Available: ${availableUnits}, Required: ${packageItem.quantity}`,
            },
            { status: 400 }
          )
        }

        // Get available units and assign them
        const units = await prisma.inventoryUnit.findMany({
          where: {
            inventoryItemId: item.id,
            status: 'AVAILABLE',
          },
          take: packageItem.quantity,
        })

        for (const unit of units) {
          const assignment = await prisma.inventoryAssignment.create({
            data: {
              inventoryItemId: item.id,
              inventoryUnitId: unit.id,
              milestoneId,
              quantity: 1,
              status: 'ASSIGNED',
            },
          })

          await prisma.inventoryUnit.update({
            where: { id: unit.id },
            data: { status: 'ASSIGNED' },
          })

          assignments.push(assignment)
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
          return NextResponse.json(
            {
              error: `Insufficient inventory for ${item.name}. Available: ${available}, Required: ${packageItem.quantity}`,
            },
            { status: 400 }
          )
        }

        const assignment = await prisma.inventoryAssignment.create({
          data: {
            inventoryItemId: item.id,
            milestoneId,
            quantity: packageItem.quantity,
            status: 'ASSIGNED',
          },
        })

        assignments.push(assignment)
      }
    }

    return NextResponse.json({
      success: true,
      assignments,
      message: `Package "${packageData.name}" applied successfully. ${assignments.length} item(s) assigned.`,
    })
  } catch (error) {
    console.error('Error applying package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

