import { redirect } from 'next/navigation'
import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Users, FolderKanban, FileText, Calendar } from 'lucide-react'

export default async function AdminDashboardPage() {
  const user = await getCurrentUserWithRole()

  if (!user) {
    redirect('/')
  }

  if (!(await isAdmin())) {
    redirect('/dashboard')
  }

  // Get system statistics
  const [
    totalUsers,
    totalProjects,
    totalTemplates,
    totalEvents,
    recentUsers,
    recentProjects,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.projectTemplate.count(),
    prisma.calendarEvent.count(),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
    prisma.project.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    }),
  ])

  const stats = [
    {
      name: 'Total Users',
      value: totalUsers,
      icon: Users,
      href: '/dashboard/admin/users',
      color: 'bg-blue-500',
    },
    {
      name: 'Total Projects',
      value: totalProjects,
      icon: FolderKanban,
      href: '/dashboard/projects',
      color: 'bg-green-500',
    },
    {
      name: 'Templates',
      value: totalTemplates,
      icon: FileText,
      href: '/dashboard/templates',
      color: 'bg-purple-500',
    },
    {
      name: 'Calendar Events',
      value: totalEvents,
      icon: Calendar,
      href: '/dashboard/calendar',
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            System overview and management
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`h-10 w-10 rounded-full ${stat.color} flex items-center justify-center text-white`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Users</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200 dark:divide-gray-700">
                {recentUsers.length === 0 ? (
                  <li className="py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No users yet</p>
                  </li>
                ) : (
                  recentUsers.map((user) => (
                    <li key={user.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.name || user.email}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="mt-6">
              <Link
                href="/dashboard/admin/users"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                View all users
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Projects</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200 dark:divide-gray-700">
                {recentProjects.length === 0 ? (
                  <li className="py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No projects yet</p>
                  </li>
                ) : (
                  recentProjects.map((project) => (
                    <li key={project.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {project.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {project.user.name || project.user.email} • {project.location}
                          </p>
                        </div>
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {project.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="mt-6">
              <Link
                href="/dashboard/projects"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                View all projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
