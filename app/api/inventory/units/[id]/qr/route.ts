import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'

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

    let unit = await prisma.inventoryUnit.findUnique({
      where: { id: params.id },
      include: {
        inventoryItem: true,
      },
    })

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // If unit doesn't have an asset tag, generate and assign one
    if (!unit.assetTag) {
      // Format: VEX-{location}-{distributor}-{number}
      // Truncate location and distributor to 3 chars
      const location = (unit.inventoryItem.location || 'LOC')
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .padEnd(3, 'X') || 'LOC'
      
      const distributor = (unit.inventoryItem.distributor || 'DIST')
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .padEnd(3, 'X') || 'DIST'
      
      // Generate sequential number based on existing units for this item
      const existingUnits = await prisma.inventoryUnit.count({
        where: {
          inventoryItemId: unit.inventoryItemId,
          assetTag: { not: null },
        },
      })
      
      const number = String(existingUnits + 1).padStart(4, '0')
      const generatedTag = `VEX-${location}-${distributor}-${number}`

      // Ensure uniqueness
      let assetTag = generatedTag
      let counter = 1
      while (await prisma.inventoryUnit.findUnique({ where: { assetTag } })) {
        const newNumber = String(existingUnits + 1 + counter).padStart(4, '0')
        assetTag = `VEX-${location}-${distributor}-${newNumber}`
        counter++
      }

      // Update unit with asset tag
      unit = await prisma.inventoryUnit.update({
        where: { id: params.id },
        data: { assetTag },
        include: {
          inventoryItem: true,
        },
      })
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

