'use client'

import { useState, useEffect } from 'react'
import { Communication } from '@prisma/client'
import { Phone, Mail, Users, FileText, Plus, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

interface CommunicationWithRelations extends Communication {
  user: {
    id: string
    name: string | null
    email: string
  }
  milestone: {
    id: string
    name: string
  } | null
}

interface CommunicationsListProps {
  projectId: string
  milestones: Array<{ id: string; name: string }>
  onUpdate: () => void
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

export default function CommunicationsList({ projectId, milestones, onUpdate }: CommunicationsListProps) {
  const [communications, setCommunications] = useState<CommunicationWithRelations[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'NOTE',
    subject: '',
    content: '',
    direction: '',
    milestoneId: '',
  })

  useEffect(() => {
    fetchCommunications()
  }, [projectId])

  const fetchCommunications = async () => {
    try {
      const response = await fetch(`/api/communications?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setCommunications(data.communications || [])
      }
    } catch (error) {
      console.error('Error fetching communications:', error)
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
      fetchCommunications()
      onUpdate()
    } catch (error) {
      console.error('Error creating communication:', error)
      alert('Failed to create communication')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (communicationId: string) => {
    if (!confirm('Are you sure you want to delete this communication?')) {
      return
    }

    try {
      const response = await fetch(`/api/communications/${communicationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete communication')
      }

      fetchCommunications()
      onUpdate()
    } catch (error) {
      console.error('Error deleting communication:', error)
      alert('Failed to delete communication')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Communications & Notes</h2>
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

      {communications.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No communications recorded yet.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {communications.map((comm) => {
            const Icon = communicationIcons[comm.type as keyof typeof communicationIcons] || FileText
            return (
              <div
                key={comm.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${communicationColors[comm.type as keyof typeof communicationColors] || communicationColors.NOTE}`}>
                          {comm.type}
                        </span>
                        {comm.direction && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {comm.direction}
                          </span>
                        )}
                        {comm.milestone && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            {comm.milestone.name}
                          </span>
                        )}
                      </div>
                      {comm.subject && (
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {comm.subject}
                        </h4>
                      )}
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {comm.content}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {comm.user.name || comm.user.email} • {new Date(comm.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(comm.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                    title="Delete communication"
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

