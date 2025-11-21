import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all inventory items with low stock indicator
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true'
    const category = searchParams.get('category')
    const jobTypeId = searchParams.get('jobTypeId')

    const where: any = {}
    if (lowStockOnly) {
      where.quantity = { lt: prisma.inventoryItem.fields.threshold }
    }
    if (category) {
      where.category = category
    }
    if (jobTypeId) {
      where.jobTypeId = jobTypeId
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        jobType: true,
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: [
        { quantity: 'asc' }, // Low stock first
        { name: 'asc' },
      ],
    })

    // Calculate available quantity (total - assigned)
    const itemsWithAvailable = await Promise.all(
      items.map(async (item) => {
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

        return {
          ...item,
          available,
          assigned,
          isLowStock,
        }
      })
    )

    return NextResponse.json({ items: itemsWithAvailable })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new inventory item
export async function POST(request: NextRequest) {
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

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Quantity is now auto-calculated from units, so set to 0 initially
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        description: description || null,
        sku: sku || null,
        category: category || null,
        jobTypeId: jobTypeId || null,
        quantity: 0, // Will be auto-calculated from units
        threshold: threshold || 0,
        unit: unit || 'each',
        location: location || null,
        supplier: supplier || null,
        distributor: distributor || null,
        distributorContact: distributorContact || null,
        orderLink: orderLink || null,
        orderPhone: orderPhone || null,
        orderEmail: orderEmail || null,
        partNumber: partNumber || null,
        cost: cost || null,
        notes: notes || null,
      },
      include: {
        jobType: true,
      },
    })

    // Calculate quantity from units (should be 0 for new item)
    const unitCount = await prisma.inventoryUnit.count({
      where: { inventoryItemId: item.id },
    })

    // Update quantity to match unit count
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: unitCount },
      include: {
        jobType: true,
      },
    })

    return NextResponse.json({ item: updatedItem }, { status: 201 })
  } catch (error) {
    console.error('Error creating inventory item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

