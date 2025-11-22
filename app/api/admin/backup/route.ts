import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import archiver from 'archiver'
import { createGraphClient } from '@/lib/sharepoint'
import { uploadBackupToSharePoint } from '@/lib/sharepoint'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Create database backup (admin only)
// Exports all data via Prisma and creates a JSON backup file
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
    
    console.log('Backup: Starting data export...')

    // Export all data from the database
    const [users, projects, milestones, files, communications, comments, statusChanges, calendarEvents, templates, templateMilestones] = await Promise.all([
      prisma.user.findMany({
        include: {
          projects: false,
          calendarEvents: false,
          milestoneComments: false,
          communications: false,
          statusChanges: false,
        },
      }),
      prisma.project.findMany({
        include: {
          template: false,
          user: false,
          milestones: false,
          files: false,
          calendarEvents: false,
          communications: false,
          statusChanges: false,
        },
      }),
      prisma.milestone.findMany({
        include: {
          project: false,
          files: false,
          comments: false,
          communications: false,
          statusChanges: false,
        },
      }),
      prisma.projectFile.findMany({
        include: {
          project: false,
          milestone: false,
        },
      }),
      prisma.communication.findMany({
        include: {
          project: false,
          milestone: false,
          user: false,
        },
      }),
      prisma.milestoneComment.findMany({
        include: {
          milestone: false,
          user: false,
        },
      }),
      prisma.statusChange.findMany({
        include: {
          project: false,
          milestone: false,
          user: false,
        },
      }),
      prisma.calendarEvent.findMany({
        include: {
          user: false,
          project: false,
        },
      }),
      prisma.projectTemplate.findMany({
        include: {
          templateMilestones: true,
          projects: false,
        },
      }),
      prisma.templateMilestone.findMany({
        include: {
          template: false,
        },
      }),
    ])

    // Get counts for metadata
    const projectCount = projects.length
    const userCount = users.length
    const milestoneCount = milestones.length
    const fileCount = files.length
    const communicationCount = communications.length
    
    console.log(`Backup: Exported ${projectCount} projects, ${userCount} users, ${milestoneCount} milestones`)

    // Create backup data structure
    const backupData = {
      version: '2.0',
      format: 'prisma-export',
      timestamp: new Date().toISOString(),
      data: {
        users,
        projects,
        milestones,
        files,
        communications,
        comments,
        statusChanges,
        calendarEvents,
        templates,
        templateMilestones,
      },
      metadata: {
        counts: {
          projects: projectCount,
          users: userCount,
          milestones: milestoneCount,
          files: fileCount,
          communications: communicationCount,
          comments: comments.length,
          statusChanges: statusChanges.length,
          calendarEvents: calendarEvents.length,
          templates: templates.length,
          templateMilestones: templateMilestones.length,
        },
        projectNames: projects.map(p => p.name),
        projectIds: projects.map(p => p.id),
      },
    }

    // Create zip archive
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `vex-backup-${timestamp}.zip`
    
    const archive = archiver('zip', { zlib: { level: 9 } })
    const chunks: Buffer[] = []

    const archivePromise = new Promise<void>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      archive.on('error', reject)
      archive.on('end', resolve)
    })

    // Add backup data as JSON
    archive.append(JSON.stringify(backupData, null, 2), { name: 'backup-data.json' })

    await archive.finalize()
    await archivePromise

    const backupBuffer = Buffer.concat(chunks)
    console.log(`Backup: Created backup file, size: ${backupBuffer.length} bytes`)

    // Upload to SharePoint if requested
    let sharepointUrl: string | null = null
    if (uploadToSharePoint && dbUser.provider === 'microsoft' && dbUser.accessToken) {
      try {
        const client = createGraphClient(dbUser.accessToken)
        const sharepointFile = await uploadBackupToSharePoint(
          client,
          backupBuffer,
          backupFileName,
          process.env.SHAREPOINT_SITE_ID,
          process.env.SHAREPOINT_DRIVE_ID
        )
        sharepointUrl = sharepointFile.webUrl
        console.log('Backup: Uploaded to SharePoint')
      } catch (error) {
        console.error('Error uploading backup to SharePoint:', error)
      }
    }

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
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
