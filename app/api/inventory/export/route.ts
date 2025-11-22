import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all inventory items with job type
    const items = await prisma.inventoryItem.findMany({
      include: {
        jobType: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate available quantities
    const itemsWithAvailability = await Promise.all(
      items.map(async (item) => {
        const assignedQuantity = await prisma.inventoryAssignment.aggregate({
          where: {
            inventoryItemId: item.id,
            status: { in: ['ASSIGNED', 'USED'] },
            inventoryUnitId: null,
          },
          _sum: {
            quantity: true,
          },
        })

        const assigned = assignedQuantity._sum.quantity || 0
        const available = item.quantity - assigned

        return {
          ...item,
          available,
          assigned,
        }
      })
    )

    // Generate CSV
    const headers = [
      'Name',
      'Description',
      'SKU',
      'Part Number',
      'Category',
      'Job Type',
      'Quantity',
      'Available',
      'Threshold',
      'Unit',
      'Track Serial Numbers',
      'Location',
      'Supplier',
      'Distributor',
      'Distributor Contact',
      'Order Link',
      'Order Phone',
      'Order Email',
      'Cost',
      'Notes',
    ]

    const rows = itemsWithAvailability.map((item) => [
      item.name,
      item.description || '',
      item.sku || '',
      item.partNumber || '',
      item.category || '',
      item.jobType?.name || '',
      item.quantity.toString(),
      item.available.toString(),
      item.threshold.toString(),
      item.unit,
      item.trackSerialNumbers ? 'Yes' : 'No',
      item.location || '',
      item.supplier || '',
      item.distributor || '',
      item.distributorContact || '',
      item.orderLink || '',
      item.orderPhone || '',
      item.orderEmail || '',
      item.cost?.toString() || '',
      item.notes || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape commas and quotes in CSV
          const cellStr = String(cell || '')
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      ),
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="inventory-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

