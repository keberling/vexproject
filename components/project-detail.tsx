'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Milestone, ProjectFile, CalendarEvent } from '@prisma/client'
import * as Tabs from '@radix-ui/react-tabs'
import MilestoneList from './milestone-list'
import FileUpload from './file-upload'
import FileList from './file-list'
import CalendarEventList from './calendar-event-list'
import { Trash2, Edit2, Save, X } from 'lucide-react'

interface ProjectDetailProps {
  project: Project & {
    milestones: Milestone[]
    files: ProjectFile[]
    calendarEvents: CalendarEvent[]
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

export default function ProjectDetail({ project: initialProject }: ProjectDetailProps) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: project.name,
    location: project.location,
    address: project.address || '',
    city: project.city || '',
    state: project.state || '',
    zipCode: project.zipCode || '',
    description: project.description || '',
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
    // Refetch the project data to update the client state
    try {
      const response = await fetch(`/api/projects/${project.id}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      }
    } catch (error) {
      console.error('Error refreshing project:', error)
    }
    router.refresh()
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
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
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] || statusColors.INITIAL_CONTACT}`}>
                {formatStatus(project.status)}
              </span>
            </div>
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
                      location: project.location,
                      address: project.address || '',
                      city: project.city || '',
                      state: project.state || '',
                      zipCode: project.zipCode || '',
                      description: project.description || '',
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

      <Tabs.Root defaultValue="overview" className="space-y-4">
        <Tabs.List className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
          <Tabs.Trigger
            value="overview"
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger
            value="milestones"
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Milestones
          </Tabs.Trigger>
          <Tabs.Trigger
            value="files"
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Files
          </Tabs.Trigger>
          <Tabs.Trigger
            value="calendar"
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Calendar Events
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="space-y-6">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
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
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{project.location}</p>
                </div>
                {(project.address || project.city || project.state) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {[project.address, project.city, project.state, project.zipCode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {project.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{project.description}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="milestones">
          <MilestoneList projectId={project.id} milestones={project.milestones} onUpdate={handleRefresh} />
        </Tabs.Content>

        <Tabs.Content value="files">
          <div className="space-y-4">
            <FileUpload projectId={project.id} onUpload={handleRefresh} />
            <FileList files={project.files} onDelete={handleRefresh} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="calendar">
          <CalendarEventList projectId={project.id} events={project.calendarEvents} onUpdate={handleRefresh} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

