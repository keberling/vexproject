import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all inventory assignments
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const inventoryItemId = searchParams.get('inventoryItemId')
    const status = searchParams.get('status')
    const assetTag = searchParams.get('assetTag') // Allow searching by asset tag

    const where: any = {}
    if (projectId) {
      where.projectId = projectId
    }
    if (inventoryItemId) {
      where.inventoryItemId = inventoryItemId
    }
    if (status) {
      where.status = status
    }
    if (assetTag) {
      // Find assignments by asset tag through the inventoryUnit relation
      where.inventoryUnit = {
        assetTag: assetTag,
      }
    }

    const assignments = await prisma.inventoryAssignment.findMany({
      where,
      include: {
        inventoryItem: true,
        inventoryUnit: {
          select: {
            id: true,
            assetTag: true,
            serialNumber: true,
            status: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Error fetching inventory assignments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Assign inventory to project
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inventoryItemId, inventoryUnitId, projectId, quantity, notes } = body

    if (!inventoryItemId || !projectId) {
      return NextResponse.json(
        { error: 'Inventory item ID and project ID are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get inventory item
    const item = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // If assigning by unit (serial number)
    if (inventoryUnitId) {
      const unit = await prisma.inventoryUnit.findUnique({
        where: { id: inventoryUnitId },
        include: { assignment: true },
      })

      if (!unit) {
        return NextResponse.json({ error: 'Inventory unit not found' }, { status: 404 })
      }

      if (unit.inventoryItemId !== inventoryItemId) {
        return NextResponse.json(
          { error: 'Unit does not belong to this inventory item' },
          { status: 400 }
        )
      }

      if (unit.status !== 'AVAILABLE') {
        return NextResponse.json(
          { error: 'Unit is not available for assignment' },
          { status: 400 }
        )
      }

      // Create assignment with unit
      const assignment = await prisma.inventoryAssignment.create({
        data: {
          inventoryItemId,
          inventoryUnitId,
          projectId,
          quantity: 1,
          notes: notes || null,
          status: 'ASSIGNED',
        },
        include: {
          inventoryItem: true,
          inventoryUnit: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // Update unit status
      await prisma.inventoryUnit.update({
        where: { id: inventoryUnitId },
        data: { status: 'ASSIGNED' },
      })

      return NextResponse.json({ assignment }, { status: 201 })
    }

    // Bulk assignment (no serial numbers)
    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity is required for bulk assignment' },
        { status: 400 }
      )
    }

    // Calculate available quantity (excluding units)
    const assignedQuantity = await prisma.inventoryAssignment.aggregate({
      where: {
        inventoryItemId: item.id,
        status: { in: ['ASSIGNED', 'USED'] },
        inventoryUnitId: null, // Only count bulk assignments
      },
      _sum: {
        quantity: true,
      },
    })

    // Count available units (not assigned)
    const availableUnits = await prisma.inventoryUnit.count({
      where: {
        inventoryItemId: item.id,
        status: 'AVAILABLE',
      },
    })

    const assigned = assignedQuantity._sum.quantity || 0
    const totalAvailable = item.quantity - assigned - availableUnits

    if (totalAvailable < quantity) {
      return NextResponse.json(
        {
          error: `Insufficient inventory. Available: ${totalAvailable}, Requested: ${quantity}`,
        },
        { status: 400 }
      )
    }

    // Create bulk assignment
    const assignment = await prisma.inventoryAssignment.create({
        data: {
          inventoryItemId,
          projectId,
          quantity,
          notes: notes || null,
          status: 'ASSIGNED',
        },
        include: {
          inventoryItem: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Error assigning inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

