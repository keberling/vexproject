import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get all items below threshold (low stock)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const items = await prisma.inventoryItem.findMany({
      where: {
        threshold: { gt: 0 }, // Only items with threshold set
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: [
        { quantity: 'asc' }, // Lowest stock first
        { name: 'asc' },
      ],
    })

    // Calculate available quantity and filter low stock items
    const lowStockItems = await Promise.all(
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

    // Filter to only low stock items
    const filtered = lowStockItems.filter((item) => item.isLowStock)

    return NextResponse.json({ items: filtered, count: filtered.length })
  } catch (error) {
    console.error('Error fetching low stock items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

