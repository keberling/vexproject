'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Milestone, ProjectFile, CalendarEvent } from '@prisma/client'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import MilestoneList from './milestone-list'
import FileUpload from './file-upload'
import FileList from './file-list'
import CalendarEventList from './calendar-event-list'
import CommunicationsList from './communications-list'
import { Trash2, Edit2, Save, X, RotateCcw } from 'lucide-react'

interface ProjectDetailProps {
  project: Project & {
    milestones: Milestone[]
    files: ProjectFile[]
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

import { projectStatusColors, formatStatus } from '@/lib/status-colors'

// Default layout configuration
const getDefaultLayout = (): Layout[] => [
  { i: 'communications', x: 0, y: 0, w: 12, h: 4, minW: 12, minH: 3, maxW: 12, maxH: 8 },
  { i: 'milestones', x: 0, y: 4, w: 12, h: 8, minW: 12, minH: 6, maxW: 12, maxH: 20 },
  { i: 'files', x: 0, y: 12, w: 12, h: 8, minW: 12, minH: 6, maxW: 12, maxH: 20 },
  { i: 'calendar', x: 0, y: 20, w: 12, h: 6, minW: 12, minH: 4, maxW: 12, maxH: 15 },
]

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

  // Load layout from localStorage or use default
  const [layout, setLayout] = useState<Layout[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`project-layout-${project.id}`)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return getDefaultLayout()
        }
      }
    }
    return getDefaultLayout()
  })

  // Save layout to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`project-layout-${project.id}`, JSON.stringify(layout))
    }
  }, [layout, project.id])

  // Handle window resize for responsive layout
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate grid width (accounting for sidebar and padding)
  const gridWidth = windowWidth > 1024 
    ? windowWidth - 256 - 64  // lg: sidebar (256px) + padding (64px)
    : windowWidth - 64  // mobile: just padding

  // Disable drag/resize on mobile
  const isMobile = windowWidth < 768

  // Reset layout to default
  const handleResetLayout = () => {
    if (confirm('Reset layout to default? This will rearrange all panels.')) {
      const defaultLayout = getDefaultLayout()
      setLayout(defaultLayout)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`project-layout-${project.id}`)
      }
    }
  }

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
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    <span className="font-medium">Location:</span> {project.location}
                  </span>
                  {(project.address || project.city || project.state) && (
                    <span>
                      <span className="font-medium">Address:</span> {[project.address, project.city, project.state, project.zipCode].filter(Boolean).join(', ')}
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
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={handleResetLayout}
                className="inline-flex items-center rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Reset layout to default"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset View
              </button>
            )}
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

      {/* Draggable Grid Layout */}
      <div className="w-full">
        <GridLayout
          className="layout"
          layout={layout}
          onLayoutChange={(newLayout) => {
            // Constrain items to stay within grid bounds
            const constrainedLayout = newLayout.map((item) => {
              // Ensure width doesn't exceed grid (12 columns)
              const constrainedW = Math.min(item.w, 12)
              
              // Ensure x position doesn't go negative or exceed grid width
              const maxX = 12 - constrainedW
              const constrainedX = Math.max(0, Math.min(item.x, maxX))
              
              // Ensure y position doesn't go negative
              const constrainedY = Math.max(0, item.y)
              
              return {
                ...item,
                x: constrainedX,
                y: constrainedY,
                w: constrainedW,
              }
            })
            setLayout(constrainedLayout)
          }}
          cols={12}
          rowHeight={60}
          width={gridWidth}
          isDraggable={false}
          isResizable={false}
          draggableHandle=".drag-handle"
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
          compactType="vertical"
          preventCollision={true}
          allowOverlap={false}
          isBounded={true}
        >
          {/* Communications Panel */}
          <div key="communications" className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Communications & Notes</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CommunicationsList 
                projectId={project.id} 
                milestones={project.milestones.map(m => ({ id: m.id, name: m.name }))}
                onUpdate={handleRefresh} 
              />
            </div>
          </div>

          {/* Milestones Panel */}
          <div key="milestones" className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Milestones</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MilestoneList projectId={project.id} milestones={project.milestones} onUpdate={handleRefresh} />
            </div>
          </div>

          {/* Files Panel */}
          <div key="files" className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Files</h2>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <FileUpload projectId={project.id} onUpload={handleRefresh} />
              <FileList files={project.files} milestones={project.milestones} onDelete={handleRefresh} />
            </div>
          </div>

          {/* Calendar Panel */}
          <div key="calendar" className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Calendar Events</h2>
            </div>
            <div className="overflow-y-auto flex-1">
              <CalendarEventList projectId={project.id} events={project.calendarEvents} onUpdate={handleRefresh} />
            </div>
          </div>
        </GridLayout>
      </div>
    </div>
  )
}

