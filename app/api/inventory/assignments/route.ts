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
    const milestoneId = searchParams.get('milestoneId')
    const inventoryItemId = searchParams.get('inventoryItemId')
    const status = searchParams.get('status')

    const where: any = {}
    if (milestoneId) {
      where.milestoneId = milestoneId
    }
    if (inventoryItemId) {
      where.inventoryItemId = inventoryItemId
    }
    if (status) {
      where.status = status
    }

    const assignments = await prisma.inventoryAssignment.findMany({
      where,
      include: {
        inventoryItem: true,
        milestone: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
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

// POST - Assign inventory to milestone
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inventoryItemId, milestoneId, quantity, notes } = body

    if (!inventoryItemId || !milestoneId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Inventory item ID, milestone ID, and positive quantity are required' },
        { status: 400 }
      )
    }

    // Verify milestone exists
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Get inventory item and check availability
    const item = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // Calculate available quantity
    const assignedQuantity = await prisma.inventoryAssignment.aggregate({
      where: {
        inventoryItemId: item.id,
        status: { in: ['ASSIGNED', 'USED'] },
      },
      _sum: {
        quantity: true,
      },
    })

    const assigned = assignedQuantity._sum.quantity || 0
    const available = item.quantity - assigned

    if (available < quantity) {
      return NextResponse.json(
        {
          error: `Insufficient inventory. Available: ${available}, Requested: ${quantity}`,
        },
        { status: 400 }
      )
    }

    // Create assignment
    const assignment = await prisma.inventoryAssignment.create({
      data: {
        inventoryItemId,
        milestoneId,
        quantity,
        notes: notes || null,
        status: 'ASSIGNED',
      },
      include: {
        inventoryItem: true,
        milestone: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
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

