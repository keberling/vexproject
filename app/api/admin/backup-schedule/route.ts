import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scheduleBackup, stopBackupScheduler } from '@/lib/backup-scheduler'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Get backup schedule (admin only)
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

    const schedule = await prisma.backupSchedule.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error('Error fetching backup schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create or update backup schedule (admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { enabled, frequency, startTime } = body

    if (!frequency) {
      return NextResponse.json({ error: 'Frequency is required' }, { status: 400 })
    }

    // Calculate next run time
    const now = new Date()
    let nextRun: Date | null = null

    if (enabled && startTime) {
      const start = new Date(startTime)
      if (start > now) {
        nextRun = start
      } else {
        // Calculate next run based on frequency
        nextRun = calculateNextRun(now, frequency)
      }
    } else if (enabled) {
      nextRun = calculateNextRun(now, frequency)
    }

    // Check if schedule exists
    const existing = await prisma.backupSchedule.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    let schedule
    if (existing) {
      // Update existing schedule
      schedule = await prisma.backupSchedule.update({
        where: { id: existing.id },
        data: {
          enabled,
          frequency,
          startTime: startTime ? new Date(startTime) : null,
          nextRun,
          updatedAt: new Date(),
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    } else {
      // Create new schedule
      schedule = await prisma.backupSchedule.create({
        data: {
          enabled,
          frequency,
          startTime: startTime ? new Date(startTime) : null,
          nextRun,
          createdBy: user.userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    }

    // Update the scheduler
    if (enabled) {
      scheduleBackup(frequency)
    } else {
      stopBackupScheduler()
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error('Error creating/updating backup schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete backup schedule (admin only)
export async function DELETE(request: NextRequest) {
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

    await prisma.backupSchedule.deleteMany()
    
    // Stop the scheduler
    stopBackupScheduler()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting backup schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate next run time
function calculateNextRun(now: Date, frequency: string): Date {
  const next = new Date(now)
  
  switch (frequency) {
    case '10min':
      next.setMinutes(next.getMinutes() + 10)
      break
    case '30min':
      next.setMinutes(next.getMinutes() + 30)
      break
    case 'hourly':
      next.setHours(next.getHours() + 1)
      break
    case 'daily':
      next.setDate(next.getDate() + 1)
      next.setHours(0, 0, 0, 0) // Start of day
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      next.setHours(0, 0, 0, 0) // Start of day
      break
    default:
      next.setHours(next.getHours() + 1) // Default to hourly
  }
  
  return next
}

