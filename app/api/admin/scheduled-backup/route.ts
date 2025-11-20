import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createReadStream, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import archiver from 'archiver'
import { createGraphClient } from '@/lib/sharepoint'
import { uploadFileToSharePoint } from '@/lib/sharepoint'

// Scheduled backup endpoint (can be called by cron job or scheduler)
// Requires ADMIN_BACKUP_SECRET in environment for security
export async function POST(request: NextRequest) {
  try {
    // Verify secret for scheduled backups
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.ADMIN_BACKUP_SECRET
    
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get admin user with Microsoft SSO for SharePoint upload
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'admin',
        provider: 'microsoft',
        accessToken: { not: null },
      },
      select: { accessToken: true },
    })

    if (!adminUser?.accessToken) {
      return NextResponse.json(
        { error: 'No admin user with Microsoft SSO found for SharePoint upload' },
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

    if (!existsSync(fullDbPath)) {
      return NextResponse.json(
        { error: 'Database file not found' },
        { status: 404 }
      )
    }

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `vex-scheduled-backup-${timestamp}.zip`
    
    // Create zip archive in memory
    const archive = archiver('zip', { zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    archive.on('error', (err) => {
      throw err
    })

    // Add database file to archive
    const dbFile = readFileSync(fullDbPath)
    archive.append(dbFile, { name: 'database.db' })

    // Add metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      databasePath: dbPath,
      type: 'scheduled',
    }
    archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' })

    await archive.finalize()

    // Wait for all chunks
    await new Promise((resolve) => {
      archive.on('end', resolve)
    })

    const backupBuffer = Buffer.concat(chunks)

    // Upload to SharePoint
    try {
      const client = createGraphClient(adminUser.accessToken)
      const sharepointFile = await uploadFileToSharePoint(
        client,
        backupBuffer,
        backupFileName,
        'Database Backups', // Use a special folder name for backups
        process.env.SHAREPOINT_SITE_ID,
        process.env.SHAREPOINT_DRIVE_ID
      )

      return NextResponse.json({
        success: true,
        message: 'Scheduled backup completed and uploaded to SharePoint',
        fileName: backupFileName,
        sharepointUrl: sharepointFile.webUrl,
        size: backupBuffer.length,
      })
    } catch (error) {
      console.error('Error uploading scheduled backup to SharePoint:', error)
      return NextResponse.json(
        { error: 'Backup created but SharePoint upload failed', details: String(error) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error creating scheduled backup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

