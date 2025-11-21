import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createGraphClient } from '@/lib/sharepoint'
import AdmZip from 'adm-zip'

// Restore database from a SharePoint backup (admin only)
// Imports data via Prisma from JSON backup file
export async function POST(
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
      select: { role: true, accessToken: true, provider: true },
    })

    if (dbUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Check if user has Microsoft SSO
    if (dbUser.provider !== 'microsoft' || !dbUser.accessToken) {
      return NextResponse.json(
        { error: 'Microsoft SSO required to restore from SharePoint' },
        { status: 400 }
      )
    }

    const backupId = params.id

    try {
      const client = createGraphClient(dbUser.accessToken)
      const siteId = process.env.SHAREPOINT_SITE_ID

      // Determine base path
      let basePath: string
      if (siteId) {
        basePath = `/sites/${siteId}`
      } else {
        basePath = '/me'
      }

      // Download the backup file from SharePoint
      console.log(`Restore: Downloading backup ${backupId} from SharePoint...`)
      const fileResponse = await client
        .api(`${basePath}/drive/items/${backupId}`)
        .get()

      const downloadUrl = fileResponse['@microsoft.graph.downloadUrl'] || fileResponse.webUrl
      
      // Fetch the file content
      const fileResponse2 = await fetch(downloadUrl)
      if (!fileResponse2.ok) {
        throw new Error(`Failed to download backup file: ${fileResponse2.statusText}`)
      }

      const arrayBuffer = await fileResponse2.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      console.log(`Restore: Downloaded backup, size: ${buffer.length} bytes`)

      // Extract the zip file
      const zip = new AdmZip(buffer)
      const zipEntries = zip.getEntries()

      // Find backup data file
      const dataEntry = zipEntries.find((entry) => 
        entry.entryName === 'backup-data.json' || entry.entryName.endsWith('.json')
      )
      
      if (!dataEntry) {
        return NextResponse.json(
          { error: 'Invalid backup file - backup-data.json not found' },
          { status: 400 }
        )
      }

      // Parse backup data
      let backupData: any
      try {
        const jsonContent = dataEntry.getData().toString()
        backupData = JSON.parse(jsonContent)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid backup file - could not parse JSON' },
          { status: 400 }
        )
      }

      console.log('Restore: Parsed backup data')
      
      if (!backupData.data) {
        return NextResponse.json(
          { error: 'Invalid backup file - missing data section' },
          { status: 400 }
        )
      }

      const { data, metadata } = backupData
      const expectedCounts = metadata?.counts || {}

      // Delete all existing data
      console.log('Restore: Clearing existing data...')
      await Promise.all([
        prisma.statusChange.deleteMany(),
        prisma.communication.deleteMany(),
        prisma.milestoneComment.deleteMany(),
        prisma.calendarEvent.deleteMany(),
        prisma.projectFile.deleteMany(),
        prisma.milestone.deleteMany(),
        prisma.project.deleteMany(),
        prisma.templateMilestone.deleteMany(),
        prisma.projectTemplate.deleteMany(),
        prisma.user.deleteMany(),
      ])

      // Restore data (same logic as file restore)
      console.log('Restore: Importing data...')
      
      if (data.users && data.users.length > 0) {
        await prisma.user.createMany({
          data: data.users.map((u: any) => ({
            id: u.id,
            email: u.email,
            password: u.password,
            name: u.name,
            role: u.role || 'user',
            provider: u.provider,
            microsoftId: u.microsoftId,
            accessToken: u.accessToken,
            refreshToken: u.refreshToken,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
          })),
        })
      }

      if (data.templates && data.templates.length > 0) {
        await prisma.projectTemplate.createMany({
          data: data.templates.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            isDefault: t.isDefault,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt),
          })),
        })
      }

      if (data.templateMilestones && data.templateMilestones.length > 0) {
        await prisma.templateMilestone.createMany({
          data: data.templateMilestones.map((tm: any) => ({
            id: tm.id,
            name: tm.name,
            description: tm.description,
            order: tm.order,
            templateId: tm.templateId,
            createdAt: new Date(tm.createdAt),
            updatedAt: new Date(tm.updatedAt),
          })),
        })
      }

      if (data.projects && data.projects.length > 0) {
        await prisma.project.createMany({
          data: data.projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            location: p.location,
            address: p.address,
            city: p.city,
            state: p.state,
            zipCode: p.zipCode,
            description: p.description,
            status: p.status,
            templateId: p.templateId,
            userId: p.userId,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          })),
        })
      }

      if (data.milestones && data.milestones.length > 0) {
        await prisma.milestone.createMany({
          data: data.milestones.map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            status: m.status,
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
            completedDate: m.completedDate ? new Date(m.completedDate) : null,
            projectId: m.projectId,
            createdAt: new Date(m.createdAt),
            updatedAt: new Date(m.updatedAt),
          })),
        })
      }

      if (data.files && data.files.length > 0) {
        await prisma.projectFile.createMany({
          data: data.files.map((f: any) => ({
            id: f.id,
            name: f.name,
            fileName: f.fileName,
            fileUrl: f.fileUrl,
            fileType: f.fileType,
            fileSize: f.fileSize,
            thumbnailUrl: f.thumbnailUrl,
            projectId: f.projectId,
            milestoneId: f.milestoneId,
            sharepointId: f.sharepointId,
            sharepointUrl: f.sharepointUrl,
            uploadedAt: new Date(f.uploadedAt),
          })),
        })
      }

      if (data.communications && data.communications.length > 0) {
        await prisma.communication.createMany({
          data: data.communications.map((c: any) => ({
            id: c.id,
            type: c.type,
            subject: c.subject,
            content: c.content,
            direction: c.direction,
            projectId: c.projectId,
            milestoneId: c.milestoneId,
            userId: c.userId,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
          })),
        })
      }

      if (data.comments && data.comments.length > 0) {
        await prisma.milestoneComment.createMany({
          data: data.comments.map((c: any) => ({
            id: c.id,
            content: c.content,
            milestoneId: c.milestoneId,
            userId: c.userId,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
          })),
        })
      }

      if (data.statusChanges && data.statusChanges.length > 0) {
        await prisma.statusChange.createMany({
          data: data.statusChanges.map((s: any) => ({
            id: s.id,
            entityType: s.entityType,
            entityId: s.entityId,
            oldStatus: s.oldStatus,
            newStatus: s.newStatus,
            projectId: s.projectId,
            milestoneId: s.milestoneId,
            userId: s.userId,
            createdAt: new Date(s.createdAt),
          })),
        })
      }

      if (data.calendarEvents && data.calendarEvents.length > 0) {
        await prisma.calendarEvent.createMany({
          data: data.calendarEvents.map((e: any) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            startDate: new Date(e.startDate),
            endDate: e.endDate ? new Date(e.endDate) : null,
            allDay: e.allDay,
            location: e.location,
            userId: e.userId,
            projectId: e.projectId,
            createdAt: new Date(e.createdAt),
            updatedAt: new Date(e.updatedAt),
          })),
        })
      }

      // Verify the restored data
      console.log('Restore: Verifying restored data...')
      const restoredProjectCount = await prisma.project.count()
      const restoredUserCount = await prisma.user.count()
      const restoredMilestoneCount = await prisma.milestone.count()
      
      const restoredProjects = await prisma.project.findMany({
        select: { id: true, name: true },
      })
      
      console.log(`Restore: Restored ${restoredProjectCount} projects, ${restoredUserCount} users, ${restoredMilestoneCount} milestones`)

      if (expectedCounts.projects !== undefined && restoredProjectCount !== expectedCounts.projects) {
        return NextResponse.json({
          success: false,
          error: `Data mismatch: Backup had ${expectedCounts.projects} projects, but restore shows ${restoredProjectCount}`,
          details: {
            backupCounts: expectedCounts,
            restoredCounts: {
              projects: restoredProjectCount,
              users: restoredUserCount,
              milestones: restoredMilestoneCount,
            },
          },
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Database restored successfully from SharePoint backup',
        restoredCounts: {
          projects: restoredProjectCount,
          users: restoredUserCount,
          milestones: restoredMilestoneCount,
        },
        restoredProjects: restoredProjects.map(p => p.name),
      })
    } catch (error: any) {
      console.error('Error restoring from SharePoint:', error)
      return NextResponse.json(
        { 
          error: 'Failed to restore from SharePoint backup',
          details: error.message || String(error),
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in sharepoint-backup restore route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
