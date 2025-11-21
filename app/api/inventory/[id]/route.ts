import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get single inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
      include: {
        jobType: true,
        assignments: {
          include: {
            inventoryUnit: true,
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
        },
        units: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
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
    const isLowStock = available < item.threshold

    return NextResponse.json({
      item: {
        ...item,
        available,
        assigned,
        isLowStock,
      },
    })
  } catch (error) {
    console.error('Error fetching inventory item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      sku,
      category,
      jobTypeId,
      trackSerialNumbers,
      quantity,
      threshold,
      unit,
      location,
      supplier,
      distributor,
      distributorContact,
      orderLink,
      orderPhone,
      orderEmail,
      partNumber,
      cost,
      notes,
    } = body

    const item = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(sku !== undefined && { sku: sku || null }),
        ...(category !== undefined && { category: category || null }),
        ...(jobTypeId !== undefined && { jobTypeId: jobTypeId || null }),
        ...(trackSerialNumbers !== undefined && { trackSerialNumbers }),
        ...(quantity !== undefined && { quantity }),
        ...(threshold !== undefined && { threshold }),
        ...(unit && { unit }),
        ...(location !== undefined && { location: location || null }),
        ...(supplier !== undefined && { supplier: supplier || null }),
        ...(distributor !== undefined && { distributor: distributor || null }),
        ...(distributorContact !== undefined && { distributorContact: distributorContact || null }),
        ...(orderLink !== undefined && { orderLink: orderLink || null }),
        ...(orderPhone !== undefined && { orderPhone: orderPhone || null }),
        ...(orderEmail !== undefined && { orderEmail: orderEmail || null }),
        ...(partNumber !== undefined && { partNumber: partNumber || null }),
        ...(cost !== undefined && { cost: cost || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        jobType: true,
      },
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if item has active assignments
    const activeAssignments = await prisma.inventoryAssignment.count({
      where: {
        inventoryItemId: params.id,
        status: { in: ['ASSIGNED', 'USED'] },
      },
    })

    if (activeAssignments > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete item with active assignments. Please return or remove assignments first.',
        },
        { status: 400 }
      )
    }

    await prisma.inventoryItem.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

