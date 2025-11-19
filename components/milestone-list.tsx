'use client'

import { useState } from 'react'
import { Milestone } from '@prisma/client'
import { Plus, Trash2, Check, Clock, XCircle } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

interface MilestoneListProps {
  projectId: string
  milestones: Milestone[]
  onUpdate: () => void
}

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: Clock,
  COMPLETED: Check,
  BLOCKED: XCircle,
}

const statusColors = {
  PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export default function MilestoneList({ projectId, milestones, onUpdate }: MilestoneListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dueDate: '',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...formData,
          dueDate: formData.dueDate || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create milestone')
      }

      setIsDialogOpen(false)
      setFormData({ name: '', description: '', dueDate: '' })
      onUpdate()
    } catch (error) {
      console.error('Error creating milestone:', error)
      alert('Failed to create milestone')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (milestoneId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update milestone')
      }

      onUpdate()
    } catch (error) {
      console.error('Error updating milestone:', error)
      alert('Failed to update milestone')
    }
  }

  const handleDelete = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) {
      return
    }

    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete milestone')
      }

      onUpdate()
    } catch (error) {
      console.error('Error deleting milestone:', error)
      alert('Failed to delete milestone')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Milestones</h2>
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Trigger asChild>
            <button className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              <Plus className="h-4 w-4 mr-1" />
              Add Milestone
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                New Milestone
              </Dialog.Title>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {milestones.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No milestones yet. Add your first milestone to get started.</p>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const StatusIcon = statusIcons[milestone.status] || Clock
            return (
              <div
                key={milestone.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <StatusIcon className={`h-5 w-5 ${milestone.status === 'COMPLETED' ? 'text-green-600' : milestone.status === 'BLOCKED' ? 'text-red-600' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{milestone.name}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[milestone.status]}`}>
                        {milestone.status}
                      </span>
                    </div>
                    {milestone.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{milestone.description}</p>
                    )}
                    {milestone.dueDate && (
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Due: {new Date(milestone.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    {milestone.completedDate && (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                        Completed: {new Date(milestone.completedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={milestone.status}
                    onChange={(e) => handleStatusChange(milestone.id, e.target.value)}
                    className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                  <button
                    onClick={() => handleDelete(milestone.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

