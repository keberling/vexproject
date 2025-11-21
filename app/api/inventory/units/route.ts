import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all inventory units for an item
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const inventoryItemId = searchParams.get('inventoryItemId')

    if (!inventoryItemId) {
      return NextResponse.json(
        { error: 'inventoryItemId is required' },
        { status: 400 }
      )
    }

    const units = await prisma.inventoryUnit.findMany({
      where: { inventoryItemId },
      include: {
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
      orderBy: [
        { status: 'asc' },
        { assetTag: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    // Clean up orphaned ASSIGNED units (units with ASSIGNED status but no assignment record)
    const orphanedUnits = units.filter((unit) => unit.status === 'ASSIGNED' && !unit.assignment)
    if (orphanedUnits.length > 0) {
      await prisma.inventoryUnit.updateMany({
        where: {
          id: { in: orphanedUnits.map((u) => u.id) },
        },
        data: {
          status: 'AVAILABLE',
        },
      })
      
      // Re-fetch units after cleanup
      const cleanedUnits = await prisma.inventoryUnit.findMany({
        where: { inventoryItemId },
        include: {
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
        orderBy: [
          { status: 'asc' },
          { assetTag: 'asc' },
          { createdAt: 'asc' },
        ],
      })
      
      return NextResponse.json({ units: cleanedUnits })
    }

    return NextResponse.json({ units })
  } catch (error) {
    console.error('Error fetching inventory units:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new inventory unit (with serial number)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inventoryItemId, assetTag, serialNumber, notes } = body

    if (!inventoryItemId) {
      return NextResponse.json(
        { error: 'inventoryItemId is required' },
        { status: 400 }
      )
    }

    // Asset tag is optional - will be assigned when printing QR code
    // If provided, check if it already exists (globally unique)
    if (assetTag && assetTag.trim()) {
      const existing = await prisma.inventoryUnit.findUnique({
        where: { assetTag: assetTag.trim() },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Asset tag already exists' },
          { status: 400 }
        )
      }
    }

    const unit = await prisma.inventoryUnit.create({
      data: {
        inventoryItemId,
        assetTag: assetTag && assetTag.trim() ? assetTag.trim() : null,
        serialNumber: serialNumber || null,
        notes: notes || null,
        status: 'AVAILABLE',
      },
    })

    // Update item quantity
    await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        quantity: { increment: 1 },
      },
    })

    return NextResponse.json({ unit }, { status: 201 })
  } catch (error) {
    console.error('Error creating inventory unit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

