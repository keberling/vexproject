import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ProjectDetail from '@/components/project-detail'

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
    },
    include: {
      milestones: {
        orderBy: { createdAt: 'asc' },
        include: {
          files: {
            orderBy: { uploadedAt: 'desc' },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          tasks: {
            orderBy: { createdAt: 'asc' },
            include: {
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  provider: true,
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
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      },
      files: {
        orderBy: { uploadedAt: 'desc' },
        include: {
          milestone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      calendarEvents: {
        orderBy: { startDate: 'asc' },
      },
      communications: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          milestone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!project) {
    redirect('/dashboard/projects')
  }

  return <ProjectDetail project={project} />
}

