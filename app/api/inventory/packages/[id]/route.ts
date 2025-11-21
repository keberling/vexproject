import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get single package
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const packageData = await prisma.inventoryPackage.findUnique({
      where: { id: params.id },
      include: {
        jobType: true,
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

    return NextResponse.json({ package: packageData })
  } catch (error) {
    console.error('Error fetching package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update package
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
    const { name, description, isDefault, items } = body

    const packageData = await prisma.inventoryPackage.findUnique({
      where: { id: params.id },
    })

    if (!packageData) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults for this job type
    if (isDefault) {
      await prisma.inventoryPackage.updateMany({
        where: {
          jobTypeId: packageData.jobTypeId,
          isDefault: true,
          id: { not: params.id },
        },
        data: {
          isDefault: false,
        },
      })
    }

    // Update package
    const updated = await prisma.inventoryPackage.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(isDefault !== undefined && { isDefault }),
      },
      include: {
        jobType: true,
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    })

    // Update items if provided
    if (items) {
      // Delete existing items
      await prisma.inventoryPackageItem.deleteMany({
        where: { packageId: params.id },
      })

      // Create new items
      await prisma.inventoryPackageItem.createMany({
        data: items.map((item: any) => ({
          packageId: params.id,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity || 1,
        })),
      })

      // Fetch updated package with items
      const updatedWithItems = await prisma.inventoryPackage.findUnique({
        where: { id: params.id },
        include: {
          jobType: true,
          items: {
            include: {
              inventoryItem: true,
            },
          },
        },
      })

      return NextResponse.json({ package: updatedWithItems })
    }

    return NextResponse.json({ package: updated })
  } catch (error) {
    console.error('Error updating package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete package
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.inventoryPackage.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

