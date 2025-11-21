'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Milestone, ProjectFile, CalendarEvent } from '@prisma/client'
import MilestoneList from './milestone-list'
import FileUpload from './file-upload'
import FileList from './file-list'
import CalendarEventList from './calendar-event-list'
import CommunicationsList from './communications-list'
import AddressAutocomplete from './address-autocomplete'
import ProjectInventorySelector from './project-inventory-selector'
import { Trash2, Edit2, Save, X, Star } from 'lucide-react'
import { projectStatusColors, formatStatus } from '@/lib/status-colors'

interface ProjectDetailProps {
  project: Project & {
    milestones: (Milestone & {
      comments?: (import('@prisma/client').MilestoneComment & {
        user: {
          id: string
          name: string | null
          email: string
        }
      })[]
    })[]
    files: (ProjectFile & {
      milestone: {
        id: string
        name: string
      } | null
    })[]
    calendarEvents: CalendarEvent[]
    communications?: Array<{
      id: string
      type: string
      subject: string | null
      content: string
      direction: string | null
      createdAt: Date
      user: {
        id: string
        name: string | null
        email: string
      }
      milestone: {
        id: string
        name: string
      } | null
    }>
  }
}

const statusOptions = [
  'INITIAL_CONTACT',
  'QUOTE_SENT',
  'QUOTE_APPROVED',
  'CONTRACT_SIGNED',
  'PAYMENT_RECEIVED',
  'PARTS_ORDERED',
  'PARTS_RECEIVED',
  'INSTALLATION_SCHEDULED',
  'INSTALLATION_IN_PROGRESS',
  'INSTALLATION_COMPLETE',
  'FINAL_INSPECTION',
  'PROJECT_COMPLETE',
  'ON_HOLD',
  'CANCELLED',
]

export default function ProjectDetail({ project: initialProject }: ProjectDetailProps) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [formData, setFormData] = useState({
    name: project.name,
    address: (project as any).address || '',
    description: project.description || '',
    jobTypeId: (project as any).jobTypeId || '',
    gcContactName: (project as any).gcContactName || '',
    gcContactEmail: (project as any).gcContactEmail || '',
    cdsContactName: (project as any).cdsContactName || '',
    cdsContactEmail: (project as any).cdsContactEmail || '',
    franchiseOwnerContactName: (project as any).franchiseOwnerContactName || '',
    franchiseOwnerContactEmail: (project as any).franchiseOwnerContactEmail || '',
    status: project.status,
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      const data = await response.json()
      setProject(data.project)
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error('Error updating project:', error)
      alert('Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      router.push('/dashboard/projects')
      router.refresh()
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      }
    } catch (error) {
      console.error('Error refreshing project:', error)
    }
    setRefreshKey(prev => prev + 1) // Trigger communications refresh
    router.refresh()
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8">
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 flex-wrap">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-2xl font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none"
                />
              ) : (
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{project.name}</h1>
              )}
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${projectStatusColors[project.status] || projectStatusColors.INITIAL_CONTACT}`}>
                {formatStatus(project.status)}
              </span>
              {!isEditing && (
                <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {(project as any).address && (
                    <span>
                      <span className="font-medium">Address:</span>{' '}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((project as any).address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                      >
                        {(project as any).address}
                      </a>
                    </span>
                  )}
                  {((project as any).gcContactName || (project as any).gcContactEmail) && (
                    <span>
                      <span className="font-medium">GC Contact:</span>{' '}
                      {(() => {
                        const name = (project as any).gcContactName || ''
                        const email = (project as any).gcContactEmail || ''
                        const parts = [name, email].filter(Boolean)
                        return parts.map((part, idx) => {
                          if (part === email && email.includes('@')) {
                            return (
                              <span key={idx}>
                                {idx > 0 && ' - '}
                                <a
                                  href={`mailto:${email}`}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                >
                                  {email}
                                </a>
                              </span>
                            )
                          }
                          return <span key={idx}>{idx > 0 && ' - '}{part}</span>
                        })
                      })()}
                    </span>
                  )}
                  {((project as any).cdsContactName || (project as any).cdsContactEmail) && (
                    <span>
                      <span className="font-medium">CDS Contact:</span>{' '}
                      {(() => {
                        const name = (project as any).cdsContactName || ''
                        const email = (project as any).cdsContactEmail || ''
                        const parts = [name, email].filter(Boolean)
                        return parts.map((part, idx) => {
                          if (part === email && email.includes('@')) {
                            return (
                              <span key={idx}>
                                {idx > 0 && ' - '}
                                <a
                                  href={`mailto:${email}`}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                >
                                  {email}
                                </a>
                              </span>
                            )
                          }
                          return <span key={idx}>{idx > 0 && ' - '}{part}</span>
                        })
                      })()}
                    </span>
                  )}
                  {((project as any).franchiseOwnerContactName || (project as any).franchiseOwnerContactEmail) && (
                    <span>
                      <span className="font-medium">Franchise Owner Contact:</span>{' '}
                      {(() => {
                        const name = (project as any).franchiseOwnerContactName || ''
                        const email = (project as any).franchiseOwnerContactEmail || ''
                        const parts = [name, email].filter(Boolean)
                        return parts.map((part, idx) => {
                          if (part === email && email.includes('@')) {
                            return (
                              <span key={idx}>
                                {idx > 0 && ' - '}
                                <a
                                  href={`mailto:${email}`}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                >
                                  {email}
                                </a>
                              </span>
                            )
                          }
                          return <span key={idx}>{idx > 0 && ' - '}{part}</span>
                        })
                      })()}
                    </span>
                  )}
                  <span>
                    <span className="font-medium">Created:</span> {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            {isEditing && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                  <div className="mt-1">
                    <AddressAutocomplete
                      value={formData.address}
                      onChange={(value) => setFormData({ ...formData, address: value })}
                      placeholder="Start typing an address or enter manually"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Type</label>
                  <select
                    value={formData.jobTypeId}
                    onChange={(e) => setFormData({ ...formData, jobTypeId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  >
                    <option value="">Select Job Type</option>
                    {jobTypes.map((jt) => (
                      <option key={jt.id} value={jt.id}>
                        {jt.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Selecting a job type will show relevant inventory items and packages
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GC Contact</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.gcContactName}
                      onChange={(e) => setFormData({ ...formData, gcContactName: e.target.value })}
                      placeholder="GC Contact Name"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                    <input
                      type="email"
                      value={formData.gcContactEmail}
                      onChange={(e) => setFormData({ ...formData, gcContactEmail: e.target.value })}
                      placeholder="GC Contact Email"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CDS Contact</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.cdsContactName}
                      onChange={(e) => setFormData({ ...formData, cdsContactName: e.target.value })}
                      placeholder="CDS Contact Name"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                    <input
                      type="email"
                      value={formData.cdsContactEmail}
                      onChange={(e) => setFormData({ ...formData, cdsContactEmail: e.target.value })}
                      placeholder="CDS Contact Email"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Franchise Owner Contact</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.franchiseOwnerContactName}
                      onChange={(e) => setFormData({ ...formData, franchiseOwnerContactName: e.target.value })}
                      placeholder="Franchise Owner Contact Name"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                    <input
                      type="email"
                      value={formData.franchiseOwnerContactEmail}
                      onChange={(e) => setFormData({ ...formData, franchiseOwnerContactEmail: e.target.value })}
                      placeholder="Franchise Owner Contact Email"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Type</label>
                  <select
                    value={formData.jobTypeId}
                    onChange={(e) => setFormData({ ...formData, jobTypeId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  >
                    <option value="">Select Job Type</option>
                    {jobTypes.map((jt) => (
                      <option key={jt.id} value={jt.id}>
                        {jt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      name: project.name,
                      address: (project as any).address || '',
                      description: project.description || '',
                      jobTypeId: (project as any).jobTypeId || '',
                      gcContactName: (project as any).gcContactName || '',
                      gcContactEmail: (project as any).gcContactEmail || '',
                      cdsContactName: (project as any).cdsContactName || '',
                      cdsContactEmail: (project as any).cdsContactEmail || '',
                      franchiseOwnerContactName: (project as any).franchiseOwnerContactName || '',
                      franchiseOwnerContactEmail: (project as any).franchiseOwnerContactEmail || '',
                      status: project.status,
                    })
                  }}
                  className="inline-flex items-center rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Important Items Header */}
      {(() => {
        const importantMilestones = project.milestones.filter((m: any) => m.isImportant)
        const importantTasks = project.milestones.flatMap((m: any) => 
          (m.tasks || []).filter((t: any) => t.isImportant).map((t: any) => ({ ...t, milestoneName: m.name }))
        )
        
        if (importantMilestones.length === 0 && importantTasks.length === 0) {
          return null
        }
        
        return (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Important Items</h2>
            </div>
            <div className="space-y-3">
              {importantMilestones.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Important Milestones:</h3>
                  <div className="space-y-1">
                    {importantMilestones.map((milestone: any) => (
                      <div key={milestone.id} className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                        <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
                        <span>{milestone.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({milestone.status})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {importantTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Important Tasks:</h3>
                  <div className="space-y-1">
                    {importantTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                        <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
                        <span>{task.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({task.milestoneName}) - {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Main Content - Stacked Layout */}
      <div className="space-y-6">
        {/* Communications & Notes Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <CommunicationsList 
            projectId={project.id} 
            milestones={project.milestones.map(m => ({ id: m.id, name: m.name }))}
            onUpdate={handleRefresh}
            refreshTrigger={refreshKey}
          />
        </div>

        {/* Inventory Section */}
        {(project as any).jobTypeId && (project as any).jobType && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Inventory ({(project as any).jobType?.name || (project as any).jobType})
              </h2>
            </div>
            <div className="p-6">
              <ProjectInventorySelector
                projectId={project.id}
                jobType={(project as any).jobType?.name || (project as any).jobType}
                jobTypeId={(project as any).jobTypeId}
                onAssign={handleRefresh}
              />
            </div>
          </div>
        )}

        {/* Milestones Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Milestones</h2>
          </div>
          <div className="p-6">
            <MilestoneList projectId={project.id} milestones={project.milestones} onUpdate={handleRefresh} />
          </div>
        </div>

        {/* Files Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Files</h2>
          </div>
          <div className="p-6 space-y-4">
            <FileUpload projectId={project.id} onUpload={handleRefresh} />
            <FileList files={project.files} milestones={project.milestones} onDelete={handleRefresh} />
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Calendar Events</h2>
          </div>
          <div className="p-6">
            <CalendarEventList projectId={project.id} events={project.calendarEvents} onUpdate={handleRefresh} />
          </div>
        </div>
      </div>
    </div>
  )
}
