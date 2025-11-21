import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all job types
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
  } catch (error) {
    console.error('Error fetching job types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new job type
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color, order } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check if job type with this name already exists
    const existing = await prisma.jobType.findUnique({
      where: { name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Job type with this name already exists' },
        { status: 400 }
      )
    }

    const jobType = await prisma.jobType.create({
      data: {
        name,
        description: description || null,
        color: color || null,
        order: order || 0,
      },
    })

    return NextResponse.json({ jobType }, { status: 201 })
  } catch (error) {
    console.error('Error creating job type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

