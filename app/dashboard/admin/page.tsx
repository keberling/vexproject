import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AdminPage from '@/components/admin-page'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  // Check if user is admin
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true },
  })

  if (dbUser?.role !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminPage />
}

