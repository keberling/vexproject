import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFileSync, existsSync, copyFileSync } from 'fs'
import { join } from 'path'
import AdmZip from 'adm-zip'

// Restore database from backup (admin only)
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No backup file provided' },
        { status: 400 }
      )
    }

    // Get database path from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl || !dbUrl.startsWith('file:')) {
      return NextResponse.json(
        { error: 'Database URL not configured for file-based database' },
        { status: 400 }
      )
    }

    const dbPath = dbUrl.replace('file:', '').replace(/^\/+/, '')
    const fullDbPath = join(process.cwd(), dbPath)

    // Read the uploaded file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract zip file
    const zip = new AdmZip(buffer)
    const zipEntries = zip.getEntries()

    // Find database file in zip
    const dbEntry = zipEntries.find((entry) => entry.entryName === 'database.db')
    
    if (!dbEntry) {
      return NextResponse.json(
        { error: 'Invalid backup file - database.db not found' },
        { status: 400 }
      )
    }

    // Create backup of current database before restore
    if (existsSync(fullDbPath)) {
      const backupPath = `${fullDbPath}.pre-restore-${Date.now()}`
      copyFileSync(fullDbPath, backupPath)
    }

    // Extract and write database file
    const dbBuffer = dbEntry.getData()
    writeFileSync(fullDbPath, dbBuffer)

    // Regenerate Prisma client to pick up new database
    // Note: In production, you may need to restart the server
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      message: 'Database restored successfully. Please restart the server to apply changes.',
    })
  } catch (error) {
    console.error('Error restoring backup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

