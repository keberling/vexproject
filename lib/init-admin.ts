import { prisma } from './prisma'

/**
 * Initialize admin user from environment variable
 * This should be called on server startup
 */
export async function initializeAdmin() {
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
      console.log(`User with email ${adminEmail} not found. Please create the user first, then they will be set as admin.`)
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

