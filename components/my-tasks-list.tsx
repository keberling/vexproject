'use client'

import { useState, useEffect } from 'react'
import { Task, TaskComment } from '@prisma/client'
import { Check, Clock, Pause, Calendar, MessageSquare, ChevronDown, ChevronUp, Trash2, Filter } from 'lucide-react'
import Link from 'next/link'
import UserAvatar from './user-avatar'

interface MyTasksListProps {
  initialTasks: (Task & {
    assignedTo: {
      id: string
      name: string | null
      email: string
      provider: string | null
    } | null
    milestone: {
      id: string
      name: string
      project: {
        id: string
        name: string
        status: string
      }
    }
    comments: (TaskComment & {
      user: {
        id: string
        name: string | null
        email: string
        provider: string | null
      }
    })[]
  })[]
}

const taskStatusIcons = {
  PENDING: Clock,
  IN_PROGRESS: Clock,
  COMPLETED: Check,
  ON_HOLD: Pause,
}

const taskStatusColors = {
  PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ON_HOLD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
}

const taskStatusLabels = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
}

export default function MyTasksList({ initialTasks }: MyTasksListProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [taskCommentTexts, setTaskCommentTexts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [statusFilter])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const url = statusFilter === 'ALL' 
        ? '/api/tasks/my-tasks'
        : `/api/tasks/my-tasks?status=${statusFilter}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const data = await response.json()
      setTasks(prev => prev.map(t => t.id === taskId ? data.task : t))
      // Refresh to get updated data
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task')
    }
  }

  const handleAddTaskComment = async (taskId: string, content?: string) => {
    const commentContent = content || taskCommentTexts[taskId]?.trim()
    if (!commentContent) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      const data = await response.json()
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, comments: [data.comment, ...t.comments] }
          : t
      ))
      setTaskCommentTexts(prev => ({ ...prev, [taskId]: '' }))
      fetchTasks()
    } catch (error) {
      console.error('Error adding task comment:', error)
      alert('Failed to add comment')
    }
  }

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'ALL') return true
    return task.status === statusFilter
  })

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-5">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {stats.total}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Tasks
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.total}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-semibold">
                  {stats.pending}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.pending}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {stats.inProgress}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    In Progress
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.inProgress}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                  {stats.completed}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.completed}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold">
                  {stats.overdue}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Overdue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.overdue}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="ALL">All Tasks</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {statusFilter === 'ALL' 
                ? 'No tasks assigned to you yet.'
                : `No ${taskStatusLabels[statusFilter as keyof typeof taskStatusLabels]?.toLowerCase()} tasks.`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTasks.map((task) => {
              const TaskStatusIcon = taskStatusIcons[task.status as keyof typeof taskStatusIcons] || Clock
              const isTaskExpanded = expandedTasks.has(task.id)
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
              
              return (
                <div
                  key={task.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <TaskStatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        task.status === 'COMPLETED' ? 'text-green-600' :
                        task.status === 'IN_PROGRESS' ? 'text-blue-600' :
                        task.status === 'ON_HOLD' ? 'text-orange-600' :
                        'text-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {task.name}
                          </h3>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${taskStatusColors[task.status as keyof typeof taskStatusColors] || taskStatusColors.PENDING}`}>
                            {taskStatusLabels[task.status as keyof typeof taskStatusLabels] || task.status}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                              Overdue
                            </span>
                          )}
                          {task.comments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <MessageSquare className="h-3 w-3" />
                              {task.comments.length}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{task.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <Link
                            href={`/dashboard/projects/${task.milestone.project.id}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                          >
                            {task.milestone.project.name}
                          </Link>
                          <span>•</span>
                          <span>{task.milestone.name}</span>
                          {task.dueDate && (
                            <>
                              <span>•</span>
                              <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateTask(task.id, { status: e.target.value })}
                        className="text-xs rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        {Object.entries(taskStatusLabels).map(([status, label]) => (
                          <option key={status} value={status}>{label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        title={isTaskExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isTaskExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isTaskExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                      <div>
                        <h6 className="text-xs font-medium text-gray-900 dark:text-white mb-2">Comments</h6>
                        <div className="space-y-2 mb-3">
                          {task.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                            >
                              <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">{comment.content}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {comment.user.name || comment.user.email} • {new Date(comment.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                          {task.comments.length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">No comments yet</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <textarea
                            value={taskCommentTexts[task.id] || ''}
                            onChange={(e) => setTaskCommentTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
                            placeholder="Add a comment..."
                            rows={2}
                            className="flex-1 text-xs rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                          />
                          <button
                            onClick={() => handleAddTaskComment(task.id)}
                            disabled={!taskCommentTexts[task.id]?.trim()}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


