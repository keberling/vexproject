import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  
  if (!email) {
    console.error('Usage: tsx scripts/set-admin.ts <email>')
    console.error('Example: tsx scripts/set-admin.ts admin@example.com')
    process.exit(1)
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.error(`User with email "${email}" not found`)
      process.exit(1)
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
    })

    console.log(`✅ User ${updatedUser.email} is now an admin`)
  } catch (error) {
    console.error('Error setting admin:', error)
    process.exit(1)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

