/**
 * Migration script to update Project model fields
 * 
 * This script safely migrates existing project data:
 * - Removes: location, city, state, zipCode (if not needed)
 * - Adds: gcContactName, gcContactEmail, cdsContactName, cdsContactEmail, 
 *         franchiseOwnerContactName, franchiseOwnerContactEmail
 * 
 * Run this BEFORE applying the schema changes if you have existing data.
 * 
 * Usage:
 *   npx tsx prisma/migrations/migrate-project-fields.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateProjectFields() {
  console.log('Starting project fields migration...')

  try {
    // Get all projects
    const projects = await prisma.$queryRaw<Array<{
      id: string
      location?: string
      city?: string
      state?: string
      zipCode?: string
      gcContact?: string
      cdsContact?: string
      franchiseOwnerContact?: string
    }>>`
      SELECT id, location, city, state, "zipCode", 
             "gcContact", "cdsContact", "franchiseOwnerContact"
      FROM Project
    `

    console.log(`Found ${projects.length} projects to migrate`)

    let migrated = 0
    let skipped = 0

    for (const project of projects) {
      try {
        // Check if new fields already exist (migration already run)
        const existing = await prisma.$queryRaw<Array<{
          gcContactName?: string
        }>>`
          SELECT "gcContactName" FROM Project WHERE id = ${project.id}
        `.catch(() => [])

        // If new fields exist, skip this project
        if (existing.length > 0 && existing[0]?.gcContactName !== undefined) {
          skipped++
          continue
        }

        // Prepare update data
        const updateData: any = {}

        // If old contact fields exist, try to parse them
        // Format: "Name <email@example.com>" or just "Name" or just "email@example.com"
        const parseContact = (contact: string | null | undefined) => {
          if (!contact) return { name: null, email: null }
          
          const emailMatch = contact.match(/([^\s<]+@[^\s>]+)/)
          const email = emailMatch ? emailMatch[1] : null
          const name = email 
            ? contact.replace(/<[^>]+>/, '').trim() || null
            : contact.includes('@') ? null : contact.trim() || null
          
          return { name, email }
        }

        if (project.gcContact) {
          const parsed = parseContact(project.gcContact)
          updateData.gcContactName = parsed.name
          updateData.gcContactEmail = parsed.email
        }

        if (project.cdsContact) {
          const parsed = parseContact(project.cdsContact)
          updateData.cdsContactName = parsed.name
          updateData.cdsContactEmail = parsed.email
        }

        if (project.franchiseOwnerContact) {
          const parsed = parseContact(project.franchiseOwnerContact)
          updateData.franchiseOwnerContactName = parsed.name
          updateData.franchiseOwnerContactEmail = parsed.email
        }

        // Only update if there's data to update
        if (Object.keys(updateData).length > 0) {
          try {
            // Try using Prisma update (works after schema is updated)
            await prisma.project.update({
              where: { id: project.id },
              data: updateData,
            })
            migrated++
          } catch (err) {
            // If Prisma update fails (schema not updated yet), try raw SQL
            try {
              const setClause = Object.entries(updateData)
                .map(([key, value]) => `"${key}" = ${value ? `'${String(value).replace(/'/g, "''")}'` : 'NULL'}`)
                .join(', ')
              
              await prisma.$executeRawUnsafe(
                `UPDATE Project SET ${setClause} WHERE id = '${project.id}'`
              )
              migrated++
            } catch (sqlErr) {
              console.error(`Failed to update project ${project.id}:`, sqlErr)
            }
          }
        } else {
          skipped++
        }
      } catch (error) {
        console.error(`Error migrating project ${project.id}:`, error)
      }
    }

    console.log(`Migration complete!`)
    console.log(`- Migrated: ${migrated} projects`)
    console.log(`- Skipped: ${skipped} projects`)
    console.log('\n⚠️  IMPORTANT: After running this script, apply the schema changes with:')
    console.log('   npx prisma migrate dev --name update_project_contact_fields')
    console.log('   OR')
    console.log('   npx prisma db push')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateProjectFields()
  .then(() => {
    console.log('Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })

