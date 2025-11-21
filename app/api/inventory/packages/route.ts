import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all packages or packages for a job type
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobTypeId = searchParams.get('jobTypeId')

    const where: any = {}
    if (jobTypeId) {
      where.jobTypeId = jobTypeId
    }

    const packages = await prisma.inventoryPackage.findMany({
      where,
      include: {
        jobType: true,
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new package
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, jobTypeId, isDefault, items } = body

    if (!name || !jobTypeId) {
      return NextResponse.json(
        { error: 'Name and job type are required' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults for this job type
    if (isDefault) {
      await prisma.inventoryPackage.updateMany({
        where: {
          jobTypeId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const packageData = await prisma.inventoryPackage.create({
      data: {
        name,
        description: description || null,
        jobTypeId,
        isDefault: isDefault || false,
        items: {
          create: (items || []).map((item: any) => ({
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity || 1,
          })),
        },
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

    return NextResponse.json({ package: packageData }, { status: 201 })
  } catch (error) {
    console.error('Error creating package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

