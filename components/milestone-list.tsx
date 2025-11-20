'use client'

import { useState, useEffect } from 'react'
import { Milestone, ProjectFile, MilestoneComment } from '@prisma/client'
import { Plus, Trash2, Check, Clock, AlertCircle, Calendar, Pause, Paperclip, MessageSquare, ChevronDown, ChevronUp, Upload, Download, File, X, Phone, Mail, FileText } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

interface MilestoneListProps {
  projectId: string
  milestones: (Milestone & {
    comments?: (MilestoneComment & {
      user: {
        id: string
        name: string | null
        email: string
      }
    })[]
  })[]
  onUpdate: () => void
}

// Helper function to record communication from milestone
export async function recordMilestoneCommunication(
  projectId: string,
  milestoneId: string,
  type: 'CALL' | 'EMAIL' | 'NOTE',
  content: string,
  direction?: 'INBOUND' | 'OUTBOUND',
  subject?: string
) {
  const response = await fetch('/api/communications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      subject: subject || null,
      content,
      direction: direction || null,
      projectId,
      milestoneId,
    }),
  })
  return response
}

const statusIcons = {
  PENDING: Clock,
  PENDING_WAITING_FOR_INFO: AlertCircle,
  PENDING_SCHEDULED: Calendar,
  IN_PROGRESS: Clock,
  COMPLETED: Check,
  ON_HOLD: Pause,
}

const statusColors = {
  PENDING: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  PENDING_WAITING_FOR_INFO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  PENDING_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ON_HOLD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
}

const statusLabels = {
  PENDING: 'Pending',
  PENDING_WAITING_FOR_INFO: 'Waiting for Info',
  PENDING_SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
}

export default function MilestoneList({ projectId, milestones, onUpdate }: MilestoneListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})
  const [milestoneFiles, setMilestoneFiles] = useState<Record<string, ProjectFile[]>>({})
  const [milestoneComments, setMilestoneComments] = useState<Record<string, (MilestoneComment & {
    user: {
      id: string
      name: string | null
      email: string
    }
  })[]>>({})
  const [milestoneCommunications, setMilestoneCommunications] = useState<Record<string, Array<{
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
  }>>>({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dueDate: '',
  })
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})

  // Pre-load comments and communications for all milestones on mount
  useEffect(() => {
    const loadAllMilestoneData = async () => {
      const commentsMap: Record<string, (MilestoneComment & {
        user: {
          id: string
          name: string | null
          email: string
        }
      })[]> = {}
      const communicationsMap: Record<string, Array<{
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
      }>> = {}

      // Use pre-loaded comments from props if available, otherwise fetch
      for (const milestone of milestones) {
        const milestoneWithComments = milestone as any
        if (milestoneWithComments.comments && Array.isArray(milestoneWithComments.comments)) {
          commentsMap[milestone.id] = milestoneWithComments.comments
        } else {
          try {
            const commentsResponse = await fetch(`/api/milestones/${milestone.id}/comments`)
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json()
              commentsMap[milestone.id] = commentsData.comments || []
            }
          } catch (error) {
            console.error(`Error fetching comments for milestone ${milestone.id}:`, error)
            commentsMap[milestone.id] = []
          }
        }

        // Fetch communications for this milestone
        try {
          const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestone.id}`)
          if (commsResponse.ok) {
            const commsData = await commsResponse.json()
            communicationsMap[milestone.id] = (commsData.communications || []).map((comm: any) => ({
              id: comm.id,
              type: comm.type,
              subject: comm.subject,
              content: comm.content,
              direction: comm.direction,
              createdAt: comm.createdAt,
              user: comm.user,
            }))
          }
        } catch (error) {
          console.error(`Error fetching communications for milestone ${milestone.id}:`, error)
          communicationsMap[milestone.id] = []
        }
      }
      setMilestoneComments(commentsMap)
      setMilestoneCommunications(communicationsMap)
    }

    loadAllMilestoneData()
  }, [milestones, projectId])

  // Fetch files for expanded milestones
  useEffect(() => {
    const fetchMilestoneFiles = async (milestoneId: string) => {
      try {
        const filesResponse = await fetch(`/api/files?milestoneId=${milestoneId}`)
        if (filesResponse.ok) {
          const filesData = await filesResponse.json()
          setMilestoneFiles(prev => ({ ...prev, [milestoneId]: filesData.files || [] }))
        }
      } catch (error) {
        console.error('Error fetching milestone files:', error)
      }
    }

    expandedMilestones.forEach(milestoneId => {
      if (!milestoneFiles[milestoneId]) {
        fetchMilestoneFiles(milestoneId)
      }
    })
  }, [expandedMilestones])

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId)
    } else {
      newExpanded.add(milestoneId)
    }
    setExpandedMilestones(newExpanded)
  }

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

  const handleFileUpload = async (milestoneId: string, file: File) => {
    setUploadingFiles(prev => ({ ...prev, [milestoneId]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('milestoneId', milestoneId)

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      // Refresh files for this milestone
      const filesResponse = await fetch(`/api/files?milestoneId=${milestoneId}`)
      if (filesResponse.ok) {
        const filesData = await filesResponse.json()
        setMilestoneFiles(prev => ({ ...prev, [milestoneId]: filesData.files || [] }))
      }
      onUpdate()
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    } finally {
      setUploadingFiles(prev => ({ ...prev, [milestoneId]: false }))
    }
  }

  const handleAddComment = async (milestoneId: string, content?: string) => {
    const commentContent = content || commentTexts[milestoneId]?.trim()
    if (!commentContent) return

    try {
      const response = await fetch(`/api/milestones/${milestoneId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      if (!content) {
        setCommentTexts(prev => ({ ...prev, [milestoneId]: '' }))
      }
      // Refresh comments for this milestone
      const commentsResponse = await fetch(`/api/milestones/${milestoneId}/comments`)
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json()
        setMilestoneComments(prev => ({ ...prev, [milestoneId]: commentsData.comments || [] }))
      }
      // Refresh communications for this milestone
      const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestoneId}`)
      if (commsResponse.ok) {
        const commsData = await commsResponse.json()
        setMilestoneCommunications(prev => ({ ...prev, [milestoneId]: (commsData.communications || []).map((comm: any) => ({
          id: comm.id,
          type: comm.type,
          subject: comm.subject,
          content: comm.content,
          direction: comm.direction,
          createdAt: comm.createdAt,
          user: comm.user,
        })) }))
      }
      onUpdate()
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
            const StatusIcon = statusIcons[milestone.status as keyof typeof statusIcons] || Clock
            const isExpanded = expandedMilestones.has(milestone.id)
            return (
              <div
                key={milestone.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 flex-1">
                    <StatusIcon className={`h-5 w-5 ${
                      milestone.status === 'COMPLETED' ? 'text-green-600' : 
                      milestone.status === 'PENDING' ? 'text-red-600' :
                      milestone.status === 'PENDING_WAITING_FOR_INFO' ? 'text-yellow-600' :
                      milestone.status === 'PENDING_SCHEDULED' ? 'text-purple-600' :
                      milestone.status === 'IN_PROGRESS' ? 'text-blue-600' :
                      milestone.status === 'ON_HOLD' ? 'text-orange-600' :
                      'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{milestone.name}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[milestone.status as keyof typeof statusColors] || statusColors.PENDING}`}>
                          {statusLabels[milestone.status as keyof typeof statusLabels] || milestone.status}
                        </span>
                        <label className="inline-flex items-center px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                          <Paperclip className="h-3 w-3" />
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(milestone.id, file)
                              e.target.value = ''
                            }}
                            disabled={uploadingFiles[milestone.id]}
                            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif"
                          />
                        </label>
                        <button
                          onClick={() => {
                            const note = prompt('Quick note:')
                            if (note && note.trim()) {
                              handleAddComment(milestone.id, note.trim())
                            }
                          }}
                          className="inline-flex items-center px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                          title="Quick note"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </button>
                        {milestoneFiles[milestone.id] && milestoneFiles[milestone.id].length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Paperclip className="h-3 w-3" />
                            {milestoneFiles[milestone.id].length}
                          </span>
                        )}
                        {((milestoneComments[milestone.id]?.length || 0) + (milestoneCommunications[milestone.id]?.length || 0)) > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <MessageSquare className="h-3 w-3" />
                            {(milestoneComments[milestone.id]?.length || 0) + (milestoneCommunications[milestone.id]?.length || 0)}
                          </span>
                        )}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      {Object.entries(statusLabels).map(([status, label]) => {
                        const isActive = milestone.status === status
                        const StatusIcon = statusIcons[status as keyof typeof statusIcons] || Clock
                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(milestone.id, status)}
                            className={`
                              inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors
                              ${isActive 
                                ? `${statusColors[status as keyof typeof statusColors]} ring-2 ring-offset-1 ring-blue-500` 
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                              }
                            `}
                            title={label}
                          >
                            <StatusIcon className="h-3 w-3" />
                            <span className="hidden sm:inline">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {uploadingFiles[milestone.id] && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Uploading...</span>
                    )}
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(milestone.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete milestone"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                    {/* File Attachments */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          Attachments ({milestoneFiles[milestone.id]?.length || 0})
                        </h4>
                        <label className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
                          <Upload className="h-3 w-3 mr-1" />
                          Upload File
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(milestone.id, file)
                              e.target.value = ''
                            }}
                            disabled={uploadingFiles[milestone.id]}
                            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif"
                          />
                        </label>
                      </div>
                      {uploadingFiles[milestone.id] && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Uploading...</p>
                      )}
                      {milestoneFiles[milestone.id] && milestoneFiles[milestone.id].length > 0 ? (
                        <div className="space-y-1">
                          {milestoneFiles[milestone.id].map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.fileSize)}</p>
                                </div>
                              </div>
                              <a
                                href={file.fileUrl}
                                download
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No files attached</p>
                      )}
                    </div>

                    {/* Comments/Notes */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4" />
                        Notes & Comments ({(milestoneComments[milestone.id]?.length || 0) + (milestoneCommunications[milestone.id]?.length || 0)})
                      </h4>
                      <div className="space-y-2 mb-3">
                        {/* Show Communications first (calls, emails, notes from quick actions) */}
                        {milestoneCommunications[milestone.id]?.map((comm) => (
                          <div
                            key={`comm-${comm.id}`}
                            className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                                comm.type === 'CALL' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                comm.type === 'EMAIL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {comm.type}
                              </span>
                              {comm.direction && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {comm.direction}
                                </span>
                              )}
                            </div>
                            {comm.subject && (
                              <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">{comm.subject}</p>
                            )}
                            <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">{comm.content}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {comm.user.name || comm.user.email} • {new Date(comm.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                        {/* Show MilestoneComments (notes added via Add button) */}
                        {milestoneComments[milestone.id]?.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                          >
                            <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">{comment.content}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {comment.user.name || comment.user.email} • {new Date(comment.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          value={commentTexts[milestone.id] || ''}
                          onChange={(e) => setCommentTexts(prev => ({ ...prev, [milestone.id]: e.target.value }))}
                          placeholder="Add a note or comment..."
                          rows={2}
                          className="flex-1 text-xs rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                        />
                        <button
                          onClick={() => handleAddComment(milestone.id)}
                          disabled={!commentTexts[milestone.id]?.trim()}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Record:</p>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => {
                              const direction = prompt('Direction: Inbound or Outbound?')?.toUpperCase()
                              const content = prompt('Call details:')
                              if (content) {
                                fetch('/api/communications', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    type: 'CALL',
                                    content,
                                    direction: direction === 'INBOUND' || direction === 'OUTBOUND' ? direction : null,
                                    projectId,
                                    milestoneId: milestone.id,
                                  }),
                                }).then(async (response) => {
                                  if (response.ok) {
                                    // Refresh communications for this milestone
                                    const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestone.id}`)
                                    if (commsResponse.ok) {
                                      const commsData = await commsResponse.json()
                                      setMilestoneCommunications(prev => ({ ...prev, [milestone.id]: (commsData.communications || []).map((comm: any) => ({
                                        id: comm.id,
                                        type: comm.type,
                                        subject: comm.subject,
                                        content: comm.content,
                                        direction: comm.direction,
                                        createdAt: comm.createdAt,
                                        user: comm.user,
                                      })) }))
                                    }
                                    alert('Call recorded!')
                                    onUpdate()
                                  } else {
                                    alert('Failed to record call')
                                  }
                                }).catch(() => alert('Failed to record call'))
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            title="Record call"
                          >
                            <Phone className="h-3 w-3" />
                            Call
                          </button>
                          <button
                            onClick={() => {
                              const direction = prompt('Direction: Inbound or Outbound?')?.toUpperCase()
                              const subject = prompt('Email subject:')
                              const content = prompt('Email details:')
                              if (content) {
                                fetch('/api/communications', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    type: 'EMAIL',
                                    subject: subject || null,
                                    content,
                                    direction: direction === 'INBOUND' || direction === 'OUTBOUND' ? direction : null,
                                    projectId,
                                    milestoneId: milestone.id,
                                  }),
                                }).then(async (response) => {
                                  if (response.ok) {
                                    // Refresh communications for this milestone
                                    const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestone.id}`)
                                    if (commsResponse.ok) {
                                      const commsData = await commsResponse.json()
                                      setMilestoneCommunications(prev => ({ ...prev, [milestone.id]: (commsData.communications || []).map((comm: any) => ({
                                        id: comm.id,
                                        type: comm.type,
                                        subject: comm.subject,
                                        content: comm.content,
                                        direction: comm.direction,
                                        createdAt: comm.createdAt,
                                        user: comm.user,
                                      })) }))
                                    }
                                    alert('Email recorded!')
                                    onUpdate()
                                  } else {
                                    alert('Failed to record email')
                                  }
                                }).catch(() => alert('Failed to record email'))
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                            title="Record email"
                          >
                            <Mail className="h-3 w-3" />
                            Email
                          </button>
                          <button
                            onClick={() => {
                              const content = prompt('Note:')
                              if (content) {
                                fetch('/api/communications', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    type: 'NOTE',
                                    content,
                                    projectId,
                                    milestoneId: milestone.id,
                                  }),
                                }).then(async (response) => {
                                  if (response.ok) {
                                    // Refresh communications for this milestone
                                    const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestone.id}`)
                                    if (commsResponse.ok) {
                                      const commsData = await commsResponse.json()
                                      setMilestoneCommunications(prev => ({ ...prev, [milestone.id]: (commsData.communications || []).map((comm: any) => ({
                                        id: comm.id,
                                        type: comm.type,
                                        subject: comm.subject,
                                        content: comm.content,
                                        direction: comm.direction,
                                        createdAt: comm.createdAt,
                                        user: comm.user,
                                      })) }))
                                    }
                                    alert('Note recorded!')
                                    onUpdate()
                                  } else {
                                    alert('Failed to record note')
                                  }
                                }).catch(() => alert('Failed to record note'))
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                            title="Record note"
                          >
                            <FileText className="h-3 w-3" />
                            Note
                          </button>
                        </div>
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
  )
}
