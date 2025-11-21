'use client'

import { useState, useEffect } from 'react'
import { X, Save, Package } from 'lucide-react'

interface InventoryAssignmentFormProps {
  inventoryItem?: any
  milestoneId?: string
  projectId?: string
  onClose: () => void
  onSave: () => void
}

export default function InventoryAssignmentForm({
  inventoryItem,
  milestoneId,
  projectId,
  onClose,
  onSave,
}: InventoryAssignmentFormProps) {
  const [milestones, setMilestones] = useState<any[]>([])
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(milestoneId || '')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [available, setAvailable] = useState(0)

  useEffect(() => {
    if (projectId) {
      fetchMilestones()
    }
    if (inventoryItem) {
      fetchAvailableQuantity()
    }
  }, [projectId, inventoryItem])

  const fetchMilestones = async () => {
    if (!projectId) return
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setMilestones(data.project.milestones || [])
      }
    } catch (error) {
      console.error('Error fetching milestones:', error)
    }
  }

  const fetchAvailableQuantity = async () => {
    if (!inventoryItem) return
    try {
      const response = await fetch(`/api/inventory/${inventoryItem.id}`)
      if (response.ok) {
        const data = await response.json()
        setAvailable(data.item.available || 0)
      }
    } catch (error) {
      console.error('Error fetching available quantity:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!selectedMilestoneId) {
      setError('Please select a milestone')
      setLoading(false)
      return
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than 0')
      setLoading(false)
      return
    }

    if (quantity > available) {
      setError(`Insufficient inventory. Available: ${available}`)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/inventory/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inventoryItemId: inventoryItem.id,
          milestoneId: selectedMilestoneId,
          quantity,
          notes: notes || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to assign inventory')
      }

      onSave()
    } catch (err: any) {
      setError(err.message || 'Error assigning inventory')
    } finally {
      setLoading(false)
    }
  }

  if (!inventoryItem) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Assign Inventory
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Item
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
              {inventoryItem.name}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Available: {available} {inventoryItem.unit}
            </div>
          </div>

          {projectId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Milestone *
              </label>
              <select
                required
                value={selectedMilestoneId}
                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a milestone</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              required
              min="1"
              max={available}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maximum: {available} {inventoryItem.unit}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

