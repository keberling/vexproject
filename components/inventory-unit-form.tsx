'use client'

import { useState } from 'react'
import { X, Save, Plus } from 'lucide-react'

interface InventoryUnitFormProps {
  inventoryItemId: string
  inventoryItemName: string
  onClose: () => void
  onSave: () => void
}

export default function InventoryUnitForm({
  inventoryItemId,
  inventoryItemName,
  onClose,
  onSave,
}: InventoryUnitFormProps) {
  const [units, setUnits] = useState([{ serialNumber: '', dateReceived: '', notes: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addUnit = () => {
    setUnits([...units, { serialNumber: '', dateReceived: '', notes: '' }])
  }

  const removeUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index))
  }

  const updateUnit = (index: number, field: 'serialNumber' | 'dateReceived' | 'notes', value: string) => {
    const newUnits = [...units]
    newUnits[index][field] = value
    setUnits(newUnits)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create all units (allow empty units - they can be filled in later)
      const promises = units.map((unit) =>
        fetch('/api/inventory/units', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inventoryItemId,
            assetTag: null, // Asset tags are assigned when printing QR codes
            serialNumber: unit.serialNumber.trim() || null,
            dateReceived: unit.dateReceived.trim() || null,
            notes: unit.notes.trim() || null,
          }),
        })
      )

      const results = await Promise.all(promises)
      const failed = results.find((r) => !r.ok)

      if (failed) {
        const data = await failed.json()
        throw new Error(data.error || 'Failed to create some units')
      }

      onSave()
    } catch (err: any) {
      setError(err.message || 'Error creating units')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Units to {inventoryItemName}
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

          <div className="space-y-3">
            {units.map((unit, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date Received
                    </label>
                    <input
                      type="date"
                      value={unit.dateReceived}
                      onChange={(e) => updateUnit(index, 'dateReceived', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Serial Number (optional)
                    </label>
                    <input
                      type="text"
                      value={unit.serialNumber}
                      onChange={(e) => updateUnit(index, 'serialNumber', e.target.value)}
                      placeholder="Enter serial number for tracking installed items"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Optional: For tracking what's installed at a job site. Asset tags are assigned when printing QR codes.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={unit.notes}
                      onChange={(e) => updateUnit(index, 'notes', e.target.value)}
                      placeholder="Additional notes about this unit"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                {units.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUnit(index)}
                    className="mt-6 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addUnit}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Plus className="h-4 w-4" />
            Add Another Unit
          </button>

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
              {loading ? 'Adding...' : `Add ${units.length} Unit${units.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

