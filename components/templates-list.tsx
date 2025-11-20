'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Edit2, Star, FileText, Download, Upload, Check } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

interface TemplateTask {
  id: string
  name: string
  description: string | null
  order: number
  assignedToId?: string | null
}

interface TemplateMilestone {
  id: string
  name: string
  description: string | null
  category: string | null
  order: number
  tasks?: TemplateTask[]
}

interface Template {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  templateMilestones: TemplateMilestone[]
  _count: {
    projects: number
  }
}

interface TemplatesListProps {
  templates: Template[]
}

export default function TemplatesList({ templates: initialTemplates }: TemplatesListProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    milestones: [{ name: '', description: '', category: '', tasks: [{ name: '', description: '', order: 0, assignedToId: null }], order: 0 }],
    isDefault: false,
  })
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([])

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }
    fetchUsers()
  }, [])

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This will not affect existing projects.')) {
      return
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      router.refresh()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          milestones: formData.milestones
            .filter(m => m.name.trim())
            .map((m, index) => ({
              name: m.name,
              description: m.description || undefined,
              category: m.category || undefined,
              tasks: (m.tasks || []).filter(t => t.name.trim()).map((t, taskIndex) => ({
                name: t.name,
                description: t.description || undefined,
                assignedToId: (t.assignedToId && t.assignedToId !== '' && t.assignedToId !== null) ? t.assignedToId : undefined,
                order: taskIndex,
              })),
              order: index,
            })),
          isDefault: formData.isDefault,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create template')
      }

      setIsDialogOpen(false)
      setFormData({
        name: '',
        description: '',
        milestones: [{ name: '', description: '', category: '', tasks: [{ name: '', description: '', order: 0, assignedToId: null }], order: 0 }],
        isDefault: false,
      })
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    setEditingTemplateId(templateId)
      setFormData({
        name: template.name,
        description: template.description || '',
        milestones: template.templateMilestones.length > 0
          ? template.templateMilestones.map(m => ({
              name: m.name,
              description: m.description || '',
              category: m.category || '',
              tasks: (m.tasks || []).map(t => ({
                name: t.name,
                description: t.description || '',
                order: t.order,
                assignedToId: (t as any).assignedToId || null,
              })),
              order: m.order,
            }))
          : [{ name: '', description: '', category: '', tasks: [{ name: '', description: '', order: 0, assignedToId: null }], order: 0 }],
        isDefault: template.isDefault,
      })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplateId) return

    setLoading(true)

    try {
      const response = await fetch(`/api/templates/${editingTemplateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          milestones: formData.milestones
            .filter(m => m.name.trim())
            .map((m, index) => ({
              name: m.name,
              description: m.description || undefined,
              category: m.category || undefined,
              tasks: (m.tasks || []).filter(t => t.name.trim()).map((t, taskIndex) => ({
                name: t.name,
                description: t.description || undefined,
                assignedToId: (t.assignedToId && t.assignedToId !== '' && t.assignedToId !== null) ? t.assignedToId : undefined,
                order: taskIndex,
              })),
              order: index,
            })),
          isDefault: formData.isDefault,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update template')
      }

      setIsEditDialogOpen(false)
      setEditingTemplateId(null)
      setFormData({
        name: '',
        description: '',
        milestones: [{ name: '', description: '', category: '', tasks: [{ name: '', description: '', order: 0, assignedToId: null }], order: 0 }],
        isDefault: false,
      })
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to update template')
    } finally {
      setLoading(false)
    }
  }

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { name: '', description: '', category: '', tasks: [{ name: '', description: '', order: 0, assignedToId: '' }], order: formData.milestones.length }],
    })
  }

  const addTask = (milestoneIndex: number) => {
    const updated = [...formData.milestones]
    updated[milestoneIndex] = {
      ...updated[milestoneIndex],
      tasks: [...(updated[milestoneIndex].tasks || []), { name: '', description: '', order: (updated[milestoneIndex].tasks || []).length, assignedToId: null }],
    }
    setFormData({ ...formData, milestones: updated })
  }

  const removeTask = (milestoneIndex: number, taskIndex: number) => {
    const updated = [...formData.milestones]
    updated[milestoneIndex] = {
      ...updated[milestoneIndex],
      tasks: (updated[milestoneIndex].tasks || []).filter((_, i) => i !== taskIndex),
    }
    setFormData({ ...formData, milestones: updated })
  }

  const updateTask = (milestoneIndex: number, taskIndex: number, field: string, value: string | null) => {
    const updated = [...formData.milestones]
    const tasks = [...(updated[milestoneIndex].tasks || [])]
    tasks[taskIndex] = { ...tasks[taskIndex], [field]: value }
    updated[milestoneIndex] = { ...updated[milestoneIndex], tasks }
    setFormData({ ...formData, milestones: updated })
  }

  const handleExport = async (templateId?: string) => {
    try {
      const url = templateId ? `/api/templates/export?id=${templateId}` : '/api/templates/export'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to export')
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = templateId ? `${templates.find(t => t.id === templateId)?.name || 'template'}.json` : 'templates_export.json'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Failed to export template')
    }
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      const response = await fetch('/api/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import')
      }

      alert('Template(s) imported successfully!')
      router.refresh()
    } catch (error: any) {
      console.error('Error importing:', error)
      alert(error.message || 'Failed to import template')
    }
  }

  const removeMilestone = (index: number) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index),
    })
  }

  const updateMilestone = (index: number, field: string, value: string) => {
    const updated = [...formData.milestones]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, milestones: updated })
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex justify-end gap-2">
        <label className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 cursor-pointer">
          <Upload className="h-4 w-4 mr-1" />
          Import
          <input
            type="file"
            className="hidden"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              e.target.value = ''
            }}
          />
        </label>
        <button
          onClick={() => handleExport()}
          className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500"
        >
          <Download className="h-4 w-4 mr-1" />
          Export All
        </button>
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Trigger asChild>
            <button className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              <Plus className="h-4 w-4 mr-1" />
              New Template
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create New Template
              </Dialog.Title>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    placeholder="e.g., Standard Installation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    placeholder="Template description..."
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Set as default template
                  </label>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Milestones *
                    </label>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                    >
                      + Add Milestone
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.milestones.map((milestone, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            required
                            value={milestone.name}
                            onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            placeholder="Milestone name"
                          />
                          <input
                            type="text"
                            value={milestone.description}
                            onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            placeholder="Description (optional)"
                          />
                          <input
                            type="text"
                            value={milestone.category || ''}
                            onChange={(e) => updateMilestone(index, 'category', e.target.value)}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            placeholder="Category (optional)"
                          />
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tasks</label>
                              <button
                                type="button"
                                onClick={() => addTask(index)}
                                className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400"
                              >
                                + Add Task
                              </button>
                            </div>
                            <div className="space-y-1">
                              {(milestone.tasks || []).map((task, taskIndex) => (
                                <div key={taskIndex} className="flex gap-1 items-start">
                                  <div className="flex-1 space-y-1">
                                    <input
                                      type="text"
                                      value={task.name}
                                      onChange={(e) => updateTask(index, taskIndex, 'name', e.target.value)}
                                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                                      placeholder="Task name"
                                    />
                                    <input
                                      type="text"
                                      value={task.description || ''}
                                      onChange={(e) => updateTask(index, taskIndex, 'description', e.target.value)}
                                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                                      placeholder="Task description (optional)"
                                    />
                                  </div>
                                  {(milestone.tasks || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeTask(index, taskIndex)}
                                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mt-1"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {formData.milestones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMilestone(index)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mt-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
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
                    {loading ? 'Creating...' : 'Create Template'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Edit Dialog */}
      <Dialog.Root open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Template
            </Dialog.Title>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  placeholder="e.g., Standard Installation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  placeholder="Template description..."
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefaultEdit"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefaultEdit" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Set as default template
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Milestones *
                  </label>
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    + Add Milestone
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.milestones.map((milestone, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          required
                          value={milestone.name}
                          onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                          placeholder="Milestone name"
                        />
                        <input
                          type="text"
                          value={milestone.description}
                          onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                          placeholder="Description (optional)"
                        />
                        <input
                          type="text"
                          value={milestone.category || ''}
                          onChange={(e) => updateMilestone(index, 'category', e.target.value)}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                          placeholder="Category (optional)"
                        />
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tasks</label>
                            <button
                              type="button"
                              onClick={() => addTask(index)}
                              className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400"
                            >
                              + Add Task
                            </button>
                          </div>
                          <div className="space-y-1">
                            {(milestone.tasks || []).map((task, taskIndex) => (
                              <div key={taskIndex} className="flex gap-1 items-start">
                                <div className="flex-1 space-y-1">
                                  <input
                                    type="text"
                                    value={task.name}
                                    onChange={(e) => updateTask(index, taskIndex, 'name', e.target.value)}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                                    placeholder="Task name"
                                  />
                                  <input
                                    type="text"
                                    value={task.description || ''}
                                    onChange={(e) => updateTask(index, taskIndex, 'description', e.target.value)}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                                    placeholder="Task description (optional)"
                                  />
                                  <select
                                    value={task.assignedToId || ''}
                                    onChange={(e) => updateTask(index, taskIndex, 'assignedToId', e.target.value || null)}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                                  >
                                    <option value="">Unassigned</option>
                                    {users.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.name || user.email}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {(milestone.tasks || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeTask(index, taskIndex)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mt-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {formData.milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mt-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(null)
                      setFormData({
                        name: '',
                        description: '',
                        milestones: [{ name: '', description: '', category: '', tasks: [{ name: '', description: '', order: 0, assignedToId: null }], order: 0 }],
                        isDefault: false,
                      })
                    }}
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
                  {loading ? 'Updating...' : 'Update Template'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No templates</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new template.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
                  {template.isDefault && (
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                {template.description && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {template.description}
                  </p>
                )}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      {template.templateMilestones.length} milestone{template.templateMilestones.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {template._count.projects} project{template._count.projects !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {template.templateMilestones.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {template.templateMilestones.slice(0, 3).map((milestone) => (
                        <div key={milestone.id} className="text-xs text-gray-400 dark:text-gray-500">
                          • {milestone.name}
                        </div>
                      ))}
                      {template.templateMilestones.length > 3 && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          +{template.templateMilestones.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => handleExport(template.id)}
                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                    title="Export template"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(template.id)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Edit template"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

