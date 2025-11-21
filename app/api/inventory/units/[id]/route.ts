import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get single inventory unit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unit = await prisma.inventoryUnit.findUnique({
      where: { id: params.id },
      include: {
        inventoryItem: true,
        assignment: {
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

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    return NextResponse.json({ unit })
  } catch (error) {
    console.error('Error fetching inventory unit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update inventory unit
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
    const { serialNumber, notes, status } = body

    const unit = await prisma.inventoryUnit.findUnique({
      where: { id: params.id },
    })

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // Check if serial number is being changed and if it conflicts
    if (serialNumber && serialNumber !== unit.serialNumber) {
      const existing = await prisma.inventoryUnit.findFirst({
        where: {
          inventoryItemId: unit.inventoryItemId,
          serialNumber,
          id: { not: params.id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Serial number already exists for this item' },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.inventoryUnit.update({
      where: { id: params.id },
      data: {
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(status && { status }),
      },
    })

    return NextResponse.json({ unit: updated })
  } catch (error) {
    console.error('Error updating inventory unit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete inventory unit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unit = await prisma.inventoryUnit.findUnique({
      where: { id: params.id },
      include: {
        assignment: true,
      },
    })

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // Check if unit is assigned
    if (unit.assignment) {
      return NextResponse.json(
        { error: 'Cannot delete unit that is assigned to a project. Return it first.' },
        { status: 400 }
      )
    }

    await prisma.inventoryUnit.delete({
      where: { id: params.id },
    })

    // Update item quantity to match unit count
    const unitCount = await prisma.inventoryUnit.count({
      where: { inventoryItemId: unit.inventoryItemId },
    })
    
    await prisma.inventoryItem.update({
      where: { id: unit.inventoryItemId },
      data: {
        quantity: unitCount,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting inventory unit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

