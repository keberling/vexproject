import { NextResponse } from 'next/server'
import { initializeBackupScheduler } from '@/lib/backup-scheduler'

// Initialize the backup scheduler on server start
// This should be called once when the server starts
export async function GET() {
  try {
    await initializeBackupScheduler()
    return NextResponse.json({ success: true, message: 'Backup scheduler initialized' })
  } catch (error) {
    console.error('Error initializing backup scheduler:', error)
    return NextResponse.json(
      { error: 'Failed to initialize backup scheduler' },
      { status: 500 }
    )
  }
}

