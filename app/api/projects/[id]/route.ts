import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
      },
      include: {
        jobType: true,
        inventoryAssignments: {
          include: {
            inventoryItem: true,
            inventoryUnit: true,
          },
          orderBy: { assignedAt: 'desc' },
        },
        milestones: {
          orderBy: { createdAt: 'asc' },
          include: {
            files: {
              orderBy: { uploadedAt: 'desc' },
            },
            comments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        files: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            milestone: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        calendarEvents: {
          orderBy: { startDate: 'asc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.userId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Track status change if status is being updated
    if (body.status && body.status !== project.status) {
      await prisma.statusChange.create({
        data: {
          entityType: 'PROJECT',
          entityId: params.id,
          oldStatus: project.status,
          newStatus: body.status,
          projectId: params.id,
          userId: user.userId,
        },
      })
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.jobTypeId !== undefined && { jobTypeId: body.jobTypeId || null }),
        ...(body.gcContactName !== undefined && { gcContactName: body.gcContactName }),
        ...(body.gcContactEmail !== undefined && { gcContactEmail: body.gcContactEmail }),
        ...(body.cdsContactName !== undefined && { cdsContactName: body.cdsContactName }),
        ...(body.cdsContactEmail !== undefined && { cdsContactEmail: body.cdsContactEmail }),
        ...(body.franchiseOwnerContactName !== undefined && { franchiseOwnerContactName: body.franchiseOwnerContactName }),
        ...(body.franchiseOwnerContactEmail !== undefined && { franchiseOwnerContactEmail: body.franchiseOwnerContactEmail }),
        ...(body.status && { status: body.status }),
      },
      include: {
        jobType: true,
        milestones: {
          orderBy: { createdAt: 'asc' },
          include: {
            files: {
              orderBy: { uploadedAt: 'desc' },
            },
            comments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        files: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            milestone: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        calendarEvents: {
          orderBy: { startDate: 'asc' },
        },
      },
    })

    return NextResponse.json({ project: updatedProject })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const isAdmin = dbUser?.role === 'admin'

    // Find the project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Only allow deletion if user is admin OR user is the project owner
    if (!isAdmin && project.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can delete other users\' projects' },
        { status: 403 }
      )
    }

    await prisma.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

