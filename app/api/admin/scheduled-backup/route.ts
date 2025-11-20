import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import archiver from 'archiver'
import { createGraphClient } from '@/lib/sharepoint'
import { uploadBackupToSharePoint } from '@/lib/sharepoint'

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

    console.log('Scheduled backup: Starting data export...')

    // Export all data from the database (same as manual backup)
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

    // Create backup data structure
    const backupData = {
      version: '2.0',
      format: 'prisma-export',
      timestamp: new Date().toISOString(),
      type: 'scheduled',
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
          projects: projects.length,
          users: users.length,
          milestones: milestones.length,
          files: files.length,
          communications: communications.length,
          comments: comments.length,
          statusChanges: statusChanges.length,
          calendarEvents: calendarEvents.length,
          templates: templates.length,
          templateMilestones: templateMilestones.length,
        },
      },
    }

    // Create zip archive
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const zipFileName = `vex-scheduled-backup-${timestamp}.zip`
    
    const archive = archiver('zip', { zlib: { level: 9 } })
    const chunks: Buffer[] = []

    const archivePromise = new Promise<void>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      archive.on('error', reject)
      archive.on('end', resolve)
    })

    archive.append(JSON.stringify(backupData, null, 2), { name: 'backup-data.json' })

    await archive.finalize()
    await archivePromise

    const backupBuffer = Buffer.concat(chunks)
    console.log(`Scheduled backup: Created backup, size: ${backupBuffer.length} bytes`)

    // Upload to SharePoint
    try {
      const client = createGraphClient(adminUser.accessToken)
      const sharepointFile = await uploadBackupToSharePoint(
        client,
        backupBuffer,
        zipFileName,
        process.env.SHAREPOINT_SITE_ID,
        process.env.SHAREPOINT_DRIVE_ID
      )

      return NextResponse.json({
        success: true,
        message: 'Scheduled backup completed and uploaded to SharePoint',
        fileName: zipFileName,
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
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
