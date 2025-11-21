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
      // Get items for specific job type (by ID or name)
      const jobTypeRecord = await prisma.jobType.findFirst({
        where: {
          OR: [
            { id: jobType },
            { name: jobType },
          ],
        },
      })

      if (!jobTypeRecord) {
        return NextResponse.json({ items: [] })
      }

      const items = await prisma.inventoryItem.findMany({
        where: {
          jobTypeId: jobTypeRecord.id,
        },
        include: {
          jobType: true,
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
      // Get all job types
      const jobTypes = await prisma.jobType.findMany({
        orderBy: [
          { order: 'asc' },
          { name: 'asc' },
        ],
        include: {
          _count: {
            select: {
              inventoryItems: true,
              projects: true,
            },
          },
        },
      })

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

