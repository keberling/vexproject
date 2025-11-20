import { PrismaClient } from '@prisma/client'
import { templates } from './templates'

const prisma = new PrismaClient()

async function main() {
  console.log(`Seeding ${templates.length} template(s) from templates.ts...`)

  for (const templateData of templates) {
    // Check if template already exists (by name)
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

