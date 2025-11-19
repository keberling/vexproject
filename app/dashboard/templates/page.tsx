import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TemplatesList from '@/components/templates-list'

export default async function TemplatesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  const templates = await prisma.projectTemplate.findMany({
    include: {
      templateMilestones: {
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { projects: true },
      },
    },
    orderBy: [
      { isDefault: 'desc' },
      { name: 'asc' },
    ],
  })

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Project Templates</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage project templates and their milestone structures
          </p>
        </div>
      </div>

      <TemplatesList templates={templates} />
    </div>
  )
}

