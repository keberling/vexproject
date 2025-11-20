import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import archiver from 'archiver'
import { createGraphClient } from '@/lib/sharepoint'
import { uploadFileToSharePoint } from '@/lib/sharepoint'

// Create database backup (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, accessToken: true, provider: true },
    })

    if (dbUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { uploadToSharePoint } = await request.json().catch(() => ({}))
    
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
    const backupFileName = `vex-backup-${timestamp}.zip`
    
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
    }
    archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' })

    await archive.finalize()

    // Wait for all chunks
    await new Promise((resolve) => {
      archive.on('end', resolve)
    })

    const backupBuffer = Buffer.concat(chunks)

    // Upload to SharePoint if requested and user has Microsoft SSO
    let sharepointUrl: string | null = null
    if (uploadToSharePoint && dbUser.provider === 'microsoft' && dbUser.accessToken) {
      try {
        const client = createGraphClient(dbUser.accessToken)
        const sharepointFile = await uploadFileToSharePoint(
          client,
          backupBuffer,
          backupFileName,
          'Database Backups', // Use a special folder name for backups
          process.env.SHAREPOINT_SITE_ID,
          process.env.SHAREPOINT_DRIVE_ID
        )
        sharepointUrl = sharepointFile.webUrl
      } catch (error) {
        console.error('Error uploading backup to SharePoint:', error)
        // Continue even if SharePoint upload fails
      }
    }

    // Return backup as download
    return new NextResponse(backupBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${backupFileName}"`,
        'Content-Length': backupBuffer.length.toString(),
        'X-Backup-Filename': backupFileName,
        ...(sharepointUrl && { 'X-SharePoint-Url': sharepointUrl }),
      },
    })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

