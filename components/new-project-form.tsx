'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AddressAutocomplete from './address-autocomplete'

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
  const [jobTypes, setJobTypes] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    jobTypeId: '',
    packageId: '',
    gcContactName: '',
    gcContactEmail: '',
    cdsContactName: '',
    cdsContactEmail: '',
    franchiseOwnerContactName: '',
    franchiseOwnerContactEmail: '',
    templateId: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, jobTypesRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/job-types'),
        ])

        if (templatesRes.ok) {
          const data = await templatesRes.json()
          setTemplates(data.templates)
          // Set default template if available
          const defaultTemplate = data.templates.find((t: Template) => t.isDefault)
          if (defaultTemplate) {
            setFormData(prev => ({ ...prev, templateId: defaultTemplate.id }))
          }
        }

        if (jobTypesRes.ok) {
          const data = await jobTypesRes.json()
          setJobTypes(data.jobTypes || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoadingTemplates(false)
      }
    }

    fetchData()
  }, [])

  // Fetch packages when job type changes
  useEffect(() => {
    const fetchPackages = async () => {
      if (!formData.jobTypeId) {
        setPackages([])
        setFormData(prev => ({ ...prev, packageId: '' }))
        return
      }

      setLoadingPackages(true)
      try {
        const response = await fetch(`/api/inventory/packages?jobTypeId=${formData.jobTypeId}`)
        if (response.ok) {
          const data = await response.json()
          setPackages(data.packages || [])
          // Auto-select default package if available
          const defaultPackage = data.packages?.find((p: any) => p.isDefault)
          if (defaultPackage) {
            setFormData(prev => ({ ...prev, packageId: defaultPackage.id }))
          } else {
            setFormData(prev => ({ ...prev, packageId: '' }))
          }
        }
      } catch (error) {
        console.error('Error fetching packages:', error)
      } finally {
        setLoadingPackages(false)
      }
    }

    fetchPackages()
  }, [formData.jobTypeId])

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

      // Navigate to the new project page
      router.push(`/dashboard/projects/${data.project.id}`)
      // Refresh will happen automatically on navigation
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
          Name *
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          placeholder="Project name"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Address
        </label>
        <div className="mt-1">
          <AddressAutocomplete
            id="address"
            name="address"
            value={formData.address}
            onChange={(value) => setFormData({ ...formData, address: value })}
            placeholder="Start typing an address or enter manually"
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Template
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
          placeholder="Project description..."
        />
      </div>

      <div>
        <label htmlFor="jobTypeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Job Type (Inventory Group)
        </label>
        <select
          name="jobTypeId"
          id="jobTypeId"
          value={formData.jobTypeId}
          onChange={handleChange}
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
          Selecting a job type will automatically show relevant inventory items and packages for this project
        </p>
      </div>

      {formData.jobTypeId && (
        <div>
          <label htmlFor="packageId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Inventory Package
          </label>
          {loadingPackages ? (
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Loading packages...</div>
          ) : (
            <select
              name="packageId"
              id="packageId"
              value={formData.packageId}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            >
              <option value="">No package (assign manually later)</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} {pkg.isDefault && '(Default)'}
                  {pkg.description && ` - ${pkg.description}`}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Select a package to automatically assign inventory items to the project's inventory milestone
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          GC Contact
        </label>
        <div className="space-y-2">
          <input
            type="text"
            name="gcContactName"
            id="gcContactName"
            value={formData.gcContactName}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            placeholder="GC Contact Name"
          />
          <input
            type="email"
            name="gcContactEmail"
            id="gcContactEmail"
            value={formData.gcContactEmail}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            placeholder="GC Contact Email"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          CDS Contact
        </label>
        <div className="space-y-2">
          <input
            type="text"
            name="cdsContactName"
            id="cdsContactName"
            value={formData.cdsContactName}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            placeholder="CDS Contact Name"
          />
          <input
            type="email"
            name="cdsContactEmail"
            id="cdsContactEmail"
            value={formData.cdsContactEmail}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            placeholder="CDS Contact Email"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Franchise Owner Contact
        </label>
        <div className="space-y-2">
          <input
            type="text"
            name="franchiseOwnerContactName"
            id="franchiseOwnerContactName"
            value={formData.franchiseOwnerContactName}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            placeholder="Franchise Owner Contact Name"
          />
          <input
            type="email"
            name="franchiseOwnerContactEmail"
            id="franchiseOwnerContactEmail"
            value={formData.franchiseOwnerContactEmail}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            placeholder="Franchise Owner Contact Email"
          />
        </div>
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

