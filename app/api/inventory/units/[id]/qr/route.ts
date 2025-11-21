import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as QRCode from 'qrcode'

// GET - Generate QR code for an inventory unit
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
      },
    })

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // Generate QR code URL that links to the inventory item/unit
    const baseUrl = process.env.AUTH_URL || request.headers.get('origin') || 'http://localhost:3000'
    const qrUrl = `${baseUrl}/dashboard/inventory/unit/${unit.id}`

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
    })

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      url: qrUrl,
      unit: {
        id: unit.id,
        assetTag: unit.assetTag,
        serialNumber: unit.serialNumber,
        inventoryItem: {
          id: unit.inventoryItem.id,
          name: unit.inventoryItem.name,
          sku: unit.inventoryItem.sku,
        },
      },
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

