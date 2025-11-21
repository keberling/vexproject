'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Save, Edit2, Trash2, GripVertical } from 'lucide-react'

interface JobTypeManagerProps {
  onClose: () => void
  onSave: () => void
}

export default function JobTypeManager({ onClose, onSave }: JobTypeManagerProps) {
  const [jobTypes, setJobTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', color: '', order: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJobTypes()
  }, [])

  const fetchJobTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/job-types')
      if (response.ok) {
        const data = await response.json()
        setJobTypes(data.jobTypes || [])
      }
    } catch (error) {
      console.error('Error fetching job types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingId(null)
    setFormData({ name: '', description: '', color: '', order: jobTypes.length })
    setError('')
  }

  const handleEdit = (jobType: any) => {
    setEditingId(jobType.id)
    setFormData({
      name: jobType.name,
      description: jobType.description || '',
      color: jobType.color || '',
      order: jobType.order || 0,
    })
    setError('')
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    try {
      const url = editingId ? `/api/job-types/${editingId}` : '/api/job-types'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save job type')
      }

      setEditingId(null)
      setFormData({ name: '', description: '', color: '', order: 0 })
      fetchJobTypes()
    } catch (err: any) {
      setError(err.message || 'Error saving job type')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job type? This will remove it from all inventory items and projects.')) {
      return
    }

    try {
      const response = await fetch(`/api/job-types/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete job type')
      }

      fetchJobTypes()
    } catch (err: any) {
      alert(err.message || 'Error deleting job type')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({ name: '', description: '', color: '', order: 0 })
    setError('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Manage Job Types
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Form */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {editingId ? 'Edit Job Type' : 'Add New Job Type'}
            </h3>
            {error && (
              <div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color (hex)
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                <Save className="h-3 w-3" />
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Job Types List */}
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
              Loading...
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Existing Job Types ({jobTypes.length})
              </h3>
              {jobTypes.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No job types yet. Create one above.
                </div>
              ) : (
                <div className="space-y-1">
                  {jobTypes.map((jobType) => (
                    <div
                      key={jobType.id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        {jobType.color && (
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: jobType.color }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {jobType.name}
                          </div>
                          {jobType.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {jobType.description}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                          {jobType._count?.inventoryItems || 0} items, {jobType._count?.projects || 0} projects
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(jobType)}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(jobType.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

