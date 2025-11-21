import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get single job type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobType = await prisma.jobType.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            inventoryItems: true,
            projects: true,
          },
        },
      },
    })

    if (!jobType) {
      return NextResponse.json({ error: 'Job type not found' }, { status: 404 })
    }

    return NextResponse.json({ jobType })
  } catch (error) {
    console.error('Error fetching job type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update job type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color, order } = body

    // If name is being changed, check for duplicates
    if (name) {
      const existing = await prisma.jobType.findFirst({
        where: {
          name,
          id: { not: params.id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Job type with this name already exists' },
          { status: 400 }
        )
      }
    }

    const jobType = await prisma.jobType.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(color !== undefined && { color: color || null }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json({ jobType })
  } catch (error) {
    console.error('Error updating job type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete job type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if job type is in use
    const inventoryCount = await prisma.inventoryItem.count({
      where: { jobTypeId: params.id },
    })

    const projectCount = await prisma.project.count({
      where: { jobTypeId: params.id },
    })

    if (inventoryCount > 0 || projectCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete job type. It is used by ${inventoryCount} inventory item(s) and ${projectCount} project(s).`,
        },
        { status: 400 }
      )
    }

    await prisma.jobType.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

