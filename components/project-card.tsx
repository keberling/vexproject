import Link from 'next/link'
import { Project, Milestone } from '@prisma/client'

interface ProjectCardProps {
  project: Project & {
    milestones: Milestone[]
    _count: {
      files: number
      calendarEvents: number
    }
  }
}

const statusColors: Record<string, string> = {
  INITIAL_CONTACT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  QUOTE_SENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  QUOTE_APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  CONTRACT_SIGNED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  PAYMENT_RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  PARTS_ORDERED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  PARTS_RECEIVED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  INSTALLATION_SCHEDULED: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  INSTALLATION_IN_PROGRESS: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  INSTALLATION_COMPLETE: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  FINAL_INSPECTION: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  PROJECT_COMPLETE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  ON_HOLD: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const completedMilestones = project.milestones.filter((m) => m.status === 'COMPLETED').length
  const totalMilestones = project.milestones.length
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
              {project.name}
            </h3>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] || statusColors.INITIAL_CONTACT}`}>
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
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{completedMilestones}/{totalMilestones} milestones</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
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

