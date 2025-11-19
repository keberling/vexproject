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
      userId: user.userId,
    },
    include: {
      milestones: {
        orderBy: { createdAt: 'asc' },
      },
      files: {
        orderBy: { uploadedAt: 'desc' },
      },
      calendarEvents: {
        orderBy: { startDate: 'asc' },
      },
    },
  })

  if (!project) {
    redirect('/dashboard/projects')
  }

  return <ProjectDetail project={project} />
}

