'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Edit2, Star, FileText } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

interface TemplateMilestone {
  id: string
  name: string
  description: string | null
  order: number
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
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    milestones: [{ name: '', description: '', order: 0 }],
  })

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
              order: index,
            })),
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
        milestones: [{ name: '', description: '', order: 0 }],
      })
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { name: '', description: '', order: formData.milestones.length }],
    })
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
      <div className="mb-4 flex justify-end">
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
                {!template.isDefault && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

