'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Template {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  templateMilestones: Array<{
    id: string
    name: string
    description: string | null
    order: number
  }>
}

export default function NewProjectForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    description: '',
    templateId: '',
  })

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates')
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates)
          // Set default template if available
          const defaultTemplate = data.templates.find((t: Template) => t.isDefault)
          if (defaultTemplate) {
            setFormData(prev => ({ ...prev, templateId: defaultTemplate.id }))
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error)
      } finally {
        setLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      router.push(`/dashboard/projects/${data.project.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Project Name *
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          placeholder="e.g., Office Building - Security System Installation"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Location *
        </label>
        <input
          type="text"
          name="location"
          id="location"
          required
          value={formData.location}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          placeholder="e.g., Main Office"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Street Address
        </label>
        <input
          type="text"
          name="address"
          id="address"
          value={formData.address}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          placeholder="123 Main St"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            City
          </label>
          <input
            type="text"
            name="city"
            id="city"
            value={formData.city}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            placeholder="City"
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            State
          </label>
          <input
            type="text"
            name="state"
            id="state"
            value={formData.state}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            placeholder="State"
            maxLength={2}
          />
        </div>
      </div>

      <div>
        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          ZIP Code
        </label>
        <input
          type="text"
          name="zipCode"
          id="zipCode"
          value={formData.zipCode}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          placeholder="12345"
        />
      </div>

      <div>
        <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Project Template
        </label>
        {loadingTemplates ? (
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Loading templates...</div>
        ) : (
          <select
            name="templateId"
            id="templateId"
            value={formData.templateId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          >
            <option value="">No template (create empty project)</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} {template.isDefault && '(Default)'}
              </option>
            ))}
          </select>
        )}
        {formData.templateId && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {(() => {
              const selectedTemplate = templates.find(t => t.id === formData.templateId)
              if (selectedTemplate) {
                return `This template includes ${selectedTemplate.templateMilestones.length} milestone${selectedTemplate.templateMilestones.length !== 1 ? 's' : ''}`
              }
              return null
            })()}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          name="description"
          id="description"
          rows={4}
          value={formData.description}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          placeholder="Project details and notes..."
        />
      </div>

      <div className="flex items-center justify-end gap-x-3">
        <Link
          href="/dashboard/projects"
          className="rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </form>
  )
}

