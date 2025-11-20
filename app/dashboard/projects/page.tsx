import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ProjectCard from '@/components/project-card'
import Link from 'next/link'

export default async function ProjectsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.userId },
    include: {
      milestones: {
        include: {
          _count: {
            select: { comments: true },
          },
        },
      },
      _count: {
        select: { 
          files: true, 
          calendarEvents: true,
          communications: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Calculate total notes count for each project (communications + milestone comments)
  const projectsWithNotes = projects.map(project => {
    const milestoneCommentsCount = project.milestones.reduce(
      (sum, milestone) => sum + milestone._count.comments,
      0
    )
    const totalNotes = project._count.communications + milestoneCommentsCount
    return {
      ...project,
      _count: {
        ...project._count,
        totalNotes,
      },
    }
  })

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Projects</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage your low voltage installation projects
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/dashboard/projects/new"
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            New Project
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No projects yet.</p>
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectsWithNotes.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

