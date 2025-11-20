import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import MyTasksList from '@/components/my-tasks-list'

export default async function MyTasksPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  // Fetch initial tasks
  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: user.userId,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          provider: true,
        },
      },
      milestone: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              provider: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Tasks</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Tasks assigned to you across all projects
          </p>
        </div>
      </div>

      <div className="mt-8">
        <MyTasksList initialTasks={tasks} />
      </div>
    </div>
  )
}


