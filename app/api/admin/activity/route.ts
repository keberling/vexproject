import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Get all user activity (admin only)
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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get recent activity across all users
    const activities = []

    // Get recent communications
    const communications = await prisma.communication.findMany({
      where: userId ? { userId } : undefined,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
        milestone: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    activities.push(
      ...communications.map((c) => ({
        id: c.id,
        type: 'communication',
        action: `${c.type} - ${c.direction || 'general'}`,
        description: c.subject || c.content.substring(0, 100),
        user: c.user,
        project: c.project,
        milestone: c.milestone,
        createdAt: c.createdAt,
      }))
    )

    // Get recent status changes
    const statusChanges = await prisma.statusChange.findMany({
      where: userId ? { userId } : undefined,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
        milestone: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    activities.push(
      ...statusChanges.map((sc) => ({
        id: sc.id,
        type: 'status_change',
        action: `${sc.entityType} status changed`,
        description: `${sc.oldStatus || 'N/A'} → ${sc.newStatus}`,
        user: sc.user,
        project: sc.project,
        milestone: sc.milestone,
        createdAt: sc.createdAt,
      }))
    )

    // Get recent milestone comments
    const comments = await prisma.milestoneComment.findMany({
      where: userId ? { userId } : undefined,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        milestone: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    activities.push(
      ...comments.map((c) => ({
        id: c.id,
        type: 'comment',
        action: 'Milestone comment',
        description: c.content.substring(0, 100),
        user: c.user,
        project: c.milestone.project,
        milestone: { id: c.milestone.id, name: c.milestone.name },
        createdAt: c.createdAt,
      }))
    )

    // Sort by date and limit
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const limitedActivities = activities.slice(0, limit)

    return NextResponse.json({ activities: limitedActivities })
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

