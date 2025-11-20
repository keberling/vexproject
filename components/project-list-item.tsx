'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Project, Milestone } from '@prisma/client'
import { Clock, AlertCircle, Calendar, Check, Pause, Paperclip, MessageSquare, MapPin, FileText, Calendar as CalendarIcon } from 'lucide-react'
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

interface ProjectListItemProps {
  project: Project & {
    milestones: Milestone[]
    _count: {
      files: number
      calendarEvents: number
      totalNotes?: number
    }
  }
}

export default function ProjectListItem({ project }: ProjectListItemProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', project.id)

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('Failed to upload file')
      }
    } catch (error) {
      alert('Failed to upload file')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleQuickNote = async () => {
    const note = prompt('Enter a quick note:')
    if (note) {
      fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          type: 'NOTE',
          content: note,
        }),
      })
        .then(() => router.refresh())
        .catch(() => alert('Failed to add note'))
    }
  }

  // Calculate milestone status counts
  const statusCounts = project.milestones.reduce((acc, milestone) => {
    acc[milestone.status] = (acc[milestone.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalMilestones = project.milestones.length
  const completedMilestones = statusCounts['COMPLETED'] || 0

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link 
                href={`/dashboard/projects/${project.id}`}
                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
              >
                {project.name}
              </Link>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${projectStatusColors[project.status] || projectStatusColors.INITIAL_CONTACT}`}>
                {formatStatus(project.status)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {project.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{project.address}</span>
                </div>
              )}
              {project.milestones.length > 0 && (
                <div className="flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  <span>{completedMilestones}/{totalMilestones} milestones</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{project._count.files} files</span>
              </div>
              {project._count.totalNotes !== undefined && project._count.totalNotes > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{project._count.totalNotes} notes</span>
                </div>
              )}
              {project._count.calendarEvents > 0 && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{project._count.calendarEvents} events</span>
                </div>
              )}
            </div>
            {project.milestones.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  {Object.entries(statusCounts).map(([status, count]) => {
                    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock
                    return (
                      <div key={status} className="flex items-center gap-1 text-xs">
                        <Icon className={`h-3 w-3 ${statusIconColors[status] || 'text-gray-500'}`} />
                        <span className="text-gray-600 dark:text-gray-400">{count}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="flex h-2 rounded-full overflow-hidden">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <div
                        key={status}
                        className={milestoneProgressColors[status] || 'bg-gray-400'}
                        style={{ width: `${(count / totalMilestones) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <label className="inline-flex items-center px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
              <Paperclip className="h-3.5 w-3.5 mr-1" />
              <span>Upload</span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
            </label>
            <button
              onClick={handleQuickNote}
              className="inline-flex items-center px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              title="Quick note"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              <span>Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

