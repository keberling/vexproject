import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check if default template already exists
  const existingTemplate = await prisma.projectTemplate.findFirst({
    where: { isDefault: true },
  })

  if (existingTemplate) {
    console.log('Default template already exists, skipping seed.')
    return
  }

  // Create default template with milestones
  const defaultTemplate = await prisma.projectTemplate.create({
    data: {
      name: 'Standard Low Voltage Installation',
      description: 'Default template for low voltage installation projects',
      isDefault: true,
      templateMilestones: {
        create: [
          {
            name: 'Initial Contact',
            description: 'Initial contact with client',
            order: 0,
          },
          {
            name: 'Quote Sent',
            description: 'Quote has been sent to client',
            order: 1,
          },
          {
            name: 'Quote Approved',
            description: 'Client has approved the quote',
            order: 2,
          },
          {
            name: 'Contract Signed',
            description: 'Contract has been signed',
            order: 3,
          },
          {
            name: 'Payment Received',
            description: 'Initial payment or deposit received',
            order: 4,
          },
          {
            name: 'Parts Ordered',
            description: 'All necessary parts have been ordered',
            order: 5,
          },
          {
            name: 'Parts Received',
            description: 'All parts have been received and verified',
            order: 6,
          },
          {
            name: 'Installation Scheduled',
            description: 'Installation date has been scheduled',
            order: 7,
          },
          {
            name: 'Installation In Progress',
            description: 'Installation work is currently in progress',
            order: 8,
          },
          {
            name: 'Installation Complete',
            description: 'Installation work has been completed',
            order: 9,
          },
          {
            name: 'Final Inspection',
            description: 'Final inspection and quality check',
            order: 10,
          },
          {
            name: 'Project Complete',
            description: 'Project is fully complete and closed',
            order: 11,
          },
        ],
      },
    },
    include: {
      templateMilestones: true,
    },
  })

  console.log('Default template created:', defaultTemplate.name)
  console.log(`Created ${defaultTemplate.templateMilestones.length} milestone templates`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

