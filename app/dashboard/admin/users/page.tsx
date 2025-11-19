import { redirect } from 'next/navigation'
import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { UserManagement } from '@/components/user-management'

export default async function AdminUsersPage() {
  const user = await getCurrentUserWithRole()

  if (!user) {
    redirect('/')
  }

  if (!(await isAdmin())) {
    redirect('/dashboard')
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          projects: true,
          calendarEvents: true,
        },
      },
    },
  })

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage system users and permissions
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/dashboard/admin"
            className="block rounded-md bg-gray-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            Back to Admin
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <UserManagement users={users} />
      </div>
    </div>
  )
}
