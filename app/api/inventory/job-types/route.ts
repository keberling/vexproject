import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get all unique job types and inventory items grouped by job type
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobType = searchParams.get('jobType')

    if (jobType) {
      // Get items for specific job type
      const items = await prisma.inventoryItem.findMany({
        where: {
          jobType: jobType,
        },
        include: {
          _count: {
            select: { assignments: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      // Calculate available quantities
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
    } else {
      // Get all unique job types
      const items = await prisma.inventoryItem.findMany({
        where: {
          jobType: { not: null },
        },
        select: {
          jobType: true,
        },
        distinct: ['jobType'],
      })

      const jobTypes = items
        .map((item) => item.jobType)
        .filter(Boolean)
        .sort()

      return NextResponse.json({ jobTypes })
    }
  } catch (error) {
    console.error('Error fetching job types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

