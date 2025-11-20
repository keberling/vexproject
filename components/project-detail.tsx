'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Milestone, ProjectFile, CalendarEvent } from '@prisma/client'
import MilestoneList from './milestone-list'
import FileUpload from './file-upload'
import FileList from './file-list'
import CalendarEventList from './calendar-event-list'
import CommunicationsList from './communications-list'
import { Trash2, Edit2, Save, X } from 'lucide-react'
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
    gcContact: (project as any).gcContact || '',
    cdsContact: (project as any).cdsContact || '',
    franchiseOwnerContact: (project as any).franchiseOwnerContact || '',
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
                      <span className="font-medium">Address:</span> {(project as any).address}
                    </span>
                  )}
                  {(project as any).gcContact && (
                    <span>
                      <span className="font-medium">GC Contact:</span> {(project as any).gcContact}
                    </span>
                  )}
                  {(project as any).cdsContact && (
                    <span>
                      <span className="font-medium">CDS Contact:</span> {(project as any).cdsContact}
                    </span>
                  )}
                  {(project as any).franchiseOwnerContact && (
                    <span>
                      <span className="font-medium">Franchise Owner Contact:</span> {(project as any).franchiseOwnerContact}
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
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">GC Contact</label>
                  <input
                    type="text"
                    value={formData.gcContact}
                    onChange={(e) => setFormData({ ...formData, gcContact: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CDS Contact</label>
                  <input
                    type="text"
                    value={formData.cdsContact}
                    onChange={(e) => setFormData({ ...formData, cdsContact: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Franchise Owner Contact</label>
                  <input
                    type="text"
                    value={formData.franchiseOwnerContact}
                    onChange={(e) => setFormData({ ...formData, franchiseOwnerContact: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
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
                      gcContact: (project as any).gcContact || '',
                      cdsContact: (project as any).cdsContact || '',
                      franchiseOwnerContact: (project as any).franchiseOwnerContact || '',
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
