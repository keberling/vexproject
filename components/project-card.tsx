'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Project, Milestone } from '@prisma/client'
import { Clock, AlertCircle, Calendar, Check, Pause, Paperclip, MessageSquare } from 'lucide-react'
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
      totalNotes?: number
    }
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  // Calculate progress based on tasks within milestones, or status if no tasks
  const milestoneProgress = project.milestones.map((milestone) => {
    const tasks = (milestone as any).tasks || []
    const totalTasks = tasks.length
    
    // If there are tasks, calculate based on task completion
    if (totalTasks > 0) {
      const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length
      return (completedTasks / totalTasks) * 100
    }
    
    // If no tasks, calculate based on milestone status
    const statusProgressMap: Record<string, number> = {
      'PENDING': 0,
      'PENDING_WAITING_FOR_INFO': 10,
      'PENDING_SCHEDULED': 20,
      'IN_PROGRESS': 50,
      'ON_HOLD': 30,
      'COMPLETED': 100,
    }
    
    return statusProgressMap[milestone.status] || 0
  })
  const overallProgress = milestoneProgress.length > 0 
    ? milestoneProgress.reduce((sum, p) => sum + p, 0) / milestoneProgress.length 
    : 0
  
  const completedMilestones = project.milestones.filter((m) => {
    const tasks = (m as any).tasks || []
    return tasks.length > 0 && tasks.every((t: any) => t.status === 'COMPLETED')
  }).length
  const totalMilestones = project.milestones.length

  // Group milestones by status for color-coded progress bar
  const milestoneStatusCounts = project.milestones.reduce((acc, milestone) => {
    const status = milestone.status
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', project.id)

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      router.refresh()
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleQuickNote = () => {
    const note = prompt('Quick note:')
    if (note && note.trim()) {
      fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'NOTE',
          content: note.trim(),
          projectId: project.id,
        }),
      })
        .then(() => {
          alert('Note added!')
          router.refresh()
        })
        .catch(() => alert('Failed to add note'))
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <Link href={`/dashboard/projects/${project.id}`} className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400">
              {project.name}
            </h3>
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <label className="inline-flex items-center px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
              <Paperclip className="h-3 w-3" />
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
            </label>
            <button
              onClick={(e) => {
                e.preventDefault()
                handleQuickNote()
              }}
              className="inline-flex items-center px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              title="Quick note"
            >
              <MessageSquare className="h-3 w-3" />
            </button>
            <Link href={`/dashboard/projects/${project.id}`}>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${projectStatusColors[project.status] || projectStatusColors.INITIAL_CONTACT}`}>
                {formatStatus(project.status)}
              </span>
            </Link>
          </div>
        </div>
        <Link href={`/dashboard/projects/${project.id}`}>
          {project.address && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                {project.address}
              </a>
            </p>
          )}
        </Link>
        {uploading && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Uploading...</p>
        )}
        <Link href={`/dashboard/projects/${project.id}`}>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>Progress (Tasks)</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            {totalMilestones > 0 ? (
              <>
                {/* Milestone progress bars */}
                <div className="space-y-1 mb-2">
                  {project.milestones.slice(0, 3).map((milestone) => {
                    const tasks = (milestone as any).tasks || []
                    const totalTasks = tasks.length
                    
                    // Calculate progress based on tasks or status
                    let taskProgress: number
                    if (totalTasks > 0) {
                      const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length
                      taskProgress = (completedTasks / totalTasks) * 100
                    } else {
                      // Use status-based progress
                      const statusProgressMap: Record<string, number> = {
                        'PENDING': 0,
                        'PENDING_WAITING_FOR_INFO': 10,
                        'PENDING_SCHEDULED': 20,
                        'IN_PROGRESS': 50,
                        'ON_HOLD': 30,
                        'COMPLETED': 100,
                      }
                      taskProgress = statusProgressMap[milestone.status] || 0
                    }
                    
                    return (
                      <div key={milestone.id} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400 truncate flex-1">{milestone.name}</span>
                          <span className="text-gray-500 dark:text-gray-500 ml-2">{Math.round(taskProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          {totalTasks > 0 ? (
                            // Show colored segments based on task statuses
                            <div className="h-1.5 flex transition-all">
                              {(() => {
                                const completed = tasks.filter((t: any) => t.status === 'COMPLETED').length
                                const inProgress = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length
                                const pending = tasks.filter((t: any) => t.status === 'PENDING' || t.status === 'ON_HOLD').length
                                return (
                                  <>
                                    {completed > 0 && (
                                      <div 
                                        className="h-full bg-green-500"
                                        style={{ width: `${(completed / totalTasks) * 100}%` }}
                                      />
                                    )}
                                    {inProgress > 0 && (
                                      <div 
                                        className="h-full bg-blue-500"
                                        style={{ width: `${(inProgress / totalTasks) * 100}%` }}
                                      />
                                    )}
                                    {pending > 0 && (
                                      <div 
                                        className="h-full bg-yellow-500"
                                        style={{ width: `${(pending / totalTasks) * 100}%` }}
                                      />
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          ) : (
                            // Show single color based on milestone status
                            <div 
                              className={`h-1.5 rounded-full transition-all ${
                                milestone.status === 'COMPLETED' 
                                  ? 'bg-green-600' // Different green for milestone completion (darker than task green)
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${taskProgress}%` }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {project.milestones.length > 3 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      +{project.milestones.length - 3} more milestones
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5" />
            )}
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{project._count.files} files</span>
              <span>{project._count.calendarEvents} events</span>
              {project._count.totalNotes !== undefined && (
                <span>{project._count.totalNotes} notes</span>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

