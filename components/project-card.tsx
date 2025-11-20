import Link from 'next/link'
import { Project, Milestone } from '@prisma/client'
import { Clock, AlertCircle, Calendar, Check, Pause } from 'lucide-react'
import { projectStatusColors, milestoneProgressColors, formatStatus } from '@/lib/status-colors'

const statusIcons = {
  PENDING: Clock,
  PENDING_WAITING_FOR_INFO: AlertCircle,
  PENDING_SCHEDULED: Calendar,
  IN_PROGRESS: Clock,
  COMPLETED: Check,
  ON_HOLD: Pause,
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PENDING_WAITING_FOR_INFO: 'Waiting',
  PENDING_SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Done',
  ON_HOLD: 'On Hold',
}

const statusIconColors: Record<string, string> = {
  PENDING: 'text-red-500',
  PENDING_WAITING_FOR_INFO: 'text-yellow-500',
  PENDING_SCHEDULED: 'text-purple-500',
  IN_PROGRESS: 'text-blue-500',
  COMPLETED: 'text-green-500',
  ON_HOLD: 'text-orange-500',
}

interface ProjectCardProps {
  project: Project & {
    milestones: Milestone[]
    _count: {
      files: number
      calendarEvents: number
    }
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const completedMilestones = project.milestones.filter((m) => m.status === 'COMPLETED').length
  const totalMilestones = project.milestones.length
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  // Group milestones by status for color-coded progress bar
  const milestoneStatusCounts = project.milestones.reduce((acc, milestone) => {
    const status = milestone.status
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
              {project.name}
            </h3>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${projectStatusColors[project.status] || projectStatusColors.INITIAL_CONTACT}`}>
              {formatStatus(project.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 truncate">
            {project.location}
          </p>
          {project.city && project.state && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {project.city}, {project.state}
            </p>
          )}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <span>{completedMilestones}/{totalMilestones} milestones</span>
            </div>
            {totalMilestones > 0 ? (
              <>
                {/* Status counts with icons */}
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  {Object.entries(milestoneStatusCounts)
                    .filter(([_, count]) => count > 0)
                    .map(([status, count]) => {
                      const Icon = statusIcons[status as keyof typeof statusIcons] || Clock
                      const iconColor = statusIconColors[status] || statusIconColors.PENDING
                      const label = statusLabels[status] || status
                      return (
                        <div
                          key={status}
                          className="flex items-center gap-1.5 text-xs"
                          title={`${label}: ${count}`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                          <span className="text-gray-600 dark:text-gray-400 font-medium">{count}</span>
                        </div>
                      )
                    })}
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 flex overflow-hidden">
                  {Object.entries(milestoneStatusCounts).map(([status, count]) => {
                    const width = (count / totalMilestones) * 100
                    const color = milestoneProgressColors[status] || milestoneProgressColors.PENDING
                    return (
                      <div
                        key={status}
                        className={`${color} h-full transition-all`}
                        style={{ width: `${width}%` }}
                        title={`${status}: ${count}`}
                      />
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5" />
            )}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{project._count.files} files</span>
            <span>{project._count.calendarEvents} events</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

