'use client'

import { useState, useEffect } from 'react'
import { Communication } from '@prisma/client'
import { Phone, Mail, Users, FileText, Plus, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

interface CommunicationItem {
  id: string
  type: string
  subject: string | null
  content: string
  direction: string | null
  createdAt: Date | string
  user: {
    id: string
    name: string | null
    email: string
  }
  milestone: {
    id: string
    name: string
  } | null
  source: 'communication' | 'milestone_comment'
}

interface CommunicationsListProps {
  projectId: string
  milestones: Array<{ id: string; name: string }>
  onUpdate: () => void
  refreshTrigger?: number
}

const communicationIcons = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  NOTE: FileText,
}

const communicationColors = {
  CALL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  EMAIL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  MEETING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  NOTE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

export default function CommunicationsList({ projectId, milestones, onUpdate, refreshTrigger }: CommunicationsListProps) {
  const [communications, setCommunications] = useState<CommunicationItem[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    type: 'NOTE',
    subject: '',
    content: '',
    direction: '',
    milestoneId: '',
  })

  useEffect(() => {
    fetchAllCommunications()
  }, [projectId, refreshTrigger])

  const fetchAllCommunications = async () => {
    setFetching(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/communications`)
      if (response.ok) {
        const data = await response.json()
        const allItems = data.items || []
        console.log('[CommunicationsList] Fetched:', allItems.length, 'total items (communications + milestone comments)')
        const milestoneItems = allItems.filter((c: CommunicationItem) => c.milestone)
        console.log('[CommunicationsList] Milestone items:', milestoneItems.length)
        setCommunications(allItems)
      } else {
        const errorText = await response.text()
        console.error('[CommunicationsList] Failed to fetch:', response.status, response.statusText, errorText)
      }
    } catch (error) {
      console.error('[CommunicationsList] Error fetching:', error)
    } finally {
      setFetching(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.content.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId,
          milestoneId: formData.milestoneId || null,
          direction: formData.direction || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create communication')
      }

      setIsDialogOpen(false)
      setFormData({
        type: 'NOTE',
        subject: '',
        content: '',
        direction: '',
        milestoneId: '',
      })
      await fetchAllCommunications()
      onUpdate()
    } catch (error) {
      console.error('Error creating communication:', error)
      alert('Failed to create communication')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemId: string, source: 'communication' | 'milestone_comment') => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      let response
      if (source === 'milestone_comment') {
        // Delete milestone comment
        const milestoneId = communications.find(c => c.id === itemId)?.milestone?.id
        if (!milestoneId) {
          throw new Error('Milestone not found')
        }
        response = await fetch(`/api/milestones/${milestoneId}/comments/${itemId}`, {
          method: 'DELETE',
        })
      } else {
        // Delete communication
        response = await fetch(`/api/communications/${itemId}`, {
          method: 'DELETE',
        })
      }

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      fetchAllCommunications()
      onUpdate()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Communications & Notes</h2>
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Trigger asChild>
            <button className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              <Plus className="h-4 w-4 mr-1" />
              Record Communication
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Record Communication
              </Dialog.Title>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  >
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="NOTE">Note</option>
                  </select>
                </div>
                {(formData.type === 'CALL' || formData.type === 'EMAIL') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Direction
                    </label>
                    <select
                      value={formData.direction}
                      onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    >
                      <option value="">Select...</option>
                      <option value="INBOUND">Inbound</option>
                      <option value="OUTBOUND">Outbound</option>
                    </select>
                  </div>
                )}
                {(formData.type === 'EMAIL' || formData.type === 'MEETING') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      placeholder="Email subject or meeting topic"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related Milestone (optional)
                  </label>
                  <select
                    value={formData.milestoneId}
                    onChange={(e) => setFormData({ ...formData, milestoneId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  >
                    <option value="">None</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Content *
                  </label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    placeholder="Details of the communication..."
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
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: '300px' }}>
        {fetching ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">Loading...</p>
        ) : communications.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">No communications recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
          {communications.map((comm) => {
            const Icon = communicationIcons[comm.type as keyof typeof communicationIcons] || FileText
            return (
              <div
                key={comm.id}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${communicationColors[comm.type as keyof typeof communicationColors] || communicationColors.NOTE}`}>
                          {comm.type}
                        </span>
                        {comm.direction && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {comm.direction}
                          </span>
                        )}
                        {comm.milestone ? (
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            Milestone: {comm.milestone.name}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Project
                          </span>
                        )}
                      </div>
                      {comm.subject && (
                        <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-0.5 truncate">
                          {comm.subject}
                        </h4>
                      )}
                      <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {comm.content}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {comm.user.name || comm.user.email} • {new Date(comm.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(comm.id, comm.source)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0 p-1"
                    title="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>
    </div>
  )
}

