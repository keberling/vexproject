import { PrismaClient } from '@prisma/client'
import { templates } from './templates'

const prisma = new PrismaClient()

async function initializeAdmin() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL

  if (!adminEmail) {
    console.log('No INITIAL_ADMIN_EMAIL set in environment variables')
    return
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, email: true, role: true },
    })

    if (!user) {
      console.log(`⚠ User with email ${adminEmail} not found. Please create the user first, then they will be set as admin.`)
      return
    }

    // Update user to admin if not already
    if (user.role !== 'admin') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'admin' },
      })
      console.log(`✓ User ${adminEmail} has been set as admin`)
    } else {
      console.log(`✓ User ${adminEmail} is already an admin`)
    }
  } catch (error) {
    console.error('Error initializing admin user:', error)
  }
}

async function main() {
  // Initialize admin user first
  await initializeAdmin()
  
  console.log(`\nSeeding ${templates.length} template(s) from templates.ts...`)

  for (const templateData of templates) {
    // Check if template already exists (by name)
    // Note: This preserves any edits made to templates in the UI.
    // Templates edited in the database will not be overwritten by seed.
    const existingTemplate = await prisma.projectTemplate.findFirst({
      where: { name: templateData.name },
    })

    if (existingTemplate) {
      console.log(`Template "${templateData.name}" already exists, skipping.`)
      continue
    }

    // If setting as default, unset other defaults first
    if (templateData.isDefault) {
      await prisma.projectTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    // Create template with milestones
    const template = await prisma.projectTemplate.create({
      data: {
        name: templateData.name,
        description: templateData.description || null,
        isDefault: templateData.isDefault,
        templateMilestones: {
          create: templateData.milestones.map((milestone) => ({
            name: milestone.name,
            description: milestone.description || null,
            order: milestone.order,
          })),
        },
      },
      include: {
        templateMilestones: true,
      },
    })

    console.log(`✓ Created template: "${template.name}"`)
    console.log(`  - ${template.templateMilestones.length} milestone(s)`)
    if (template.isDefault) {
      console.log(`  - Marked as default template`)
    }
  }

  console.log('\nTemplate seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

