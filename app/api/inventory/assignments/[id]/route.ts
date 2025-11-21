import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT - Update inventory assignment (mark as used, returned, or update quantity)
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
    const { status, quantity, notes } = body

    const assignment = await prisma.inventoryAssignment.findUnique({
      where: { id: params.id },
      include: {
        inventoryItem: true,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const updateData: any = {}
    
    if (status) {
      updateData.status = status
      if (status === 'USED' && !assignment.usedAt) {
        updateData.usedAt = new Date()
      }
      if (status === 'RETURNED' && !assignment.returnedAt) {
        updateData.returnedAt = new Date()
      }
    }
    
    if (quantity !== undefined) {
      // Check if new quantity is available
      if (status === 'ASSIGNED' || !status) {
        const assignedQuantity = await prisma.inventoryAssignment.aggregate({
          where: {
            inventoryItemId: assignment.inventoryItemId,
            status: { in: ['ASSIGNED', 'USED'] },
            id: { not: params.id }, // Exclude current assignment
          },
          _sum: {
            quantity: true,
          },
        })

        const assigned = assignedQuantity._sum.quantity || 0
        const available = assignment.inventoryItem.quantity - assigned

        if (available < quantity) {
          return NextResponse.json(
            {
              error: `Insufficient inventory. Available: ${available}, Requested: ${quantity}`,
            },
            { status: 400 }
          )
        }
      }
      updateData.quantity = quantity
    }
    
    if (notes !== undefined) {
      updateData.notes = notes || null
    }

    const updated = await prisma.inventoryAssignment.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ assignment: updated })
  } catch (error) {
    console.error('Error updating inventory assignment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove inventory assignment (return to inventory)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.inventoryAssignment.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting inventory assignment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

