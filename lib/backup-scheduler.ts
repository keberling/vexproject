import * as cron from 'node-cron'
import { prisma } from './prisma'

let scheduledTask: cron.ScheduledTask | null = null
let initialized = false

// Auto-initialize on module load (only once)
if (!initialized && typeof window === 'undefined') {
  // Only run on server-side
  initializeBackupScheduler().catch((error) => {
    console.error('Failed to auto-initialize backup scheduler:', error)
  })
  initialized = true
}

// Initialize the backup scheduler
export async function initializeBackupScheduler() {
  // Load the schedule from database
  const schedule = await prisma.backupSchedule.findFirst({
    where: { enabled: true },
    orderBy: { createdAt: 'desc' },
  })

  if (schedule) {
    scheduleBackup(schedule.frequency)
  }
}

// Schedule a backup task
export function scheduleBackup(frequency: string) {
  // Stop existing task if any
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
  }

  // Convert frequency to cron expression
  const cronExpression = getCronExpression(frequency)
  
  if (!cronExpression) {
    console.error(`Invalid backup frequency: ${frequency}`)
    return
  }

  console.log(`Scheduling backups with frequency: ${frequency} (cron: ${cronExpression})`)

  // Schedule the task
  scheduledTask = cron.schedule(cronExpression, async () => {
    try {
      console.log('Running scheduled backup...')
      
      // Get admin user with Microsoft SSO
      const adminUser = await prisma.user.findFirst({
        where: {
          role: 'admin',
          provider: 'microsoft',
          accessToken: { not: null },
        },
        select: { accessToken: true },
      })

      if (!adminUser?.accessToken) {
        console.error('Scheduled backup: No admin user with Microsoft SSO found')
        return
      }

      // Call the scheduled backup endpoint
      const backupSecret = process.env.ADMIN_BACKUP_SECRET
      if (!backupSecret) {
        console.error('Scheduled backup: ADMIN_BACKUP_SECRET not set')
        return
      }

      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/admin/scheduled-backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${backupSecret}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Scheduled backup completed:', result.message)
        
        // Update last run time
        const schedule = await prisma.backupSchedule.findFirst({
          where: { enabled: true },
          orderBy: { createdAt: 'desc' },
        })
        
        if (schedule) {
          const nextRun = calculateNextRun(new Date(), schedule.frequency)
          await prisma.backupSchedule.update({
            where: { id: schedule.id },
            data: {
              lastRun: new Date(),
              nextRun,
            },
          })
        }
      } else {
        const error = await response.json()
        console.error('Scheduled backup failed:', error)
      }
    } catch (error) {
      console.error('Error running scheduled backup:', error)
    }
  }, {
    timezone: 'America/New_York', // Adjust as needed
  })
}

// Stop the backup scheduler
export function stopBackupScheduler() {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    console.log('Backup scheduler stopped')
  }
}

// Convert frequency to cron expression
function getCronExpression(frequency: string): string | null {
  switch (frequency) {
    case '10min':
      return '*/10 * * * *' // Every 10 minutes
    case '30min':
      return '*/30 * * * *' // Every 30 minutes
    case 'hourly':
      return '0 * * * *' // Every hour at minute 0
    case 'daily':
      return '0 0 * * *' // Every day at midnight
    case 'weekly':
      return '0 0 * * 0' // Every Sunday at midnight
    default:
      return null
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
      next.setHours(0, 0, 0, 0)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      next.setHours(0, 0, 0, 0)
      break
    default:
      next.setHours(next.getHours() + 1)
  }
  
  return next
}

