import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate CSV template with headers and one example row
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

    const exampleRow = [
      'Example Item',
      'Example description',
      'SKU-001',
      'PN-001',
      'Cables',
      'Installation',
      '10',
      '10',
      '5',
      'each',
      'No',
      'Warehouse A',
      'Example Supplier',
      'Example Distributor',
      'John Doe',
      'https://example.com/order',
      '555-1234',
      'orders@example.com',
      '25.99',
      'Example notes',
    ]

    const csvContent = [
      headers.join(','),
      exampleRow.map((cell) => `"${cell}"`).join(','),
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="inventory-import-template.csv"',
      },
    })
  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

