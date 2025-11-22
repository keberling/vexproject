import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// GET - Get label settings (or create default if none exist)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    })

    if (dbUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get or create default settings
    let settings = await prisma.labelSettings.findFirst()

    if (!settings) {
      settings = await prisma.labelSettings.create({
        data: {},
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching label settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update label settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    })

    if (dbUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      labelWidth,
      labelHeight,
      qrCodeSize,
      fontSize,
      showItemName,
      showAssetTag,
      showSerialNumber,
      showQRCode,
      labelTemplate,
    } = body

    // Get or create settings
    let settings = await prisma.labelSettings.findFirst()

    if (!settings) {
      settings = await prisma.labelSettings.create({
        data: {},
      })
    }

    // Update settings
    const updated = await prisma.labelSettings.update({
      where: { id: settings.id },
      data: {
        ...(labelWidth !== undefined && { labelWidth }),
        ...(labelHeight !== undefined && { labelHeight }),
        ...(qrCodeSize !== undefined && { qrCodeSize }),
        ...(fontSize !== undefined && { fontSize }),
        ...(showItemName !== undefined && { showItemName }),
        ...(showAssetTag !== undefined && { showAssetTag }),
        ...(showSerialNumber !== undefined && { showSerialNumber }),
        ...(showQRCode !== undefined && { showQRCode }),
        ...(labelTemplate !== undefined && { labelTemplate: labelTemplate || null }),
      },
    })

    return NextResponse.json({ settings: updated })
  } catch (error) {
    console.error('Error updating label settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

