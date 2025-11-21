'use client'

import { useState } from 'react'
import { X, Save, Trash2 } from 'lucide-react'

interface SelectSerialsToRemoveProps {
  inventoryItem: any
  currentQuantity: number
  newQuantity: number
  assignedUnits: any[]
  onClose: () => void
  onConfirm: (unitIdsToRemove: string[]) => void
}

export default function SelectSerialsToRemove({
  inventoryItem,
  currentQuantity,
  newQuantity,
  assignedUnits,
  onClose,
  onConfirm,
}: SelectSerialsToRemoveProps) {
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([])
  const unitsToRemove = currentQuantity - newQuantity

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) => {
      if (prev.includes(unitId)) {
        return prev.filter((id) => id !== unitId)
      } else {
        if (prev.length < unitsToRemove) {
          return [...prev, unitId]
        }
        return prev
      }
    })
  }

  const handleConfirm = () => {
    if (selectedUnitIds.length !== unitsToRemove) {
      alert(`Please select exactly ${unitsToRemove} unit${unitsToRemove !== 1 ? 's' : ''} to remove.`)
      return
    }
    onConfirm(selectedUnitIds)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Select Serial Numbers to Remove
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>{inventoryItem.name}</strong> currently has <strong>{currentQuantity}</strong> unit{currentQuantity !== 1 ? 's' : ''} total.
              You're reducing it to <strong>{newQuantity}</strong> unit{newQuantity !== 1 ? 's' : ''}.
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-400 mt-2">
              Since this item has serial numbers assigned to projects, please select <strong>{unitsToRemove}</strong> unit{unitsToRemove !== 1 ? 's' : ''} to unassign from projects:
            </p>
          </div>

          {assignedUnits.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No assigned units found for this item.
            </div>
          ) : (
            <div className="space-y-2">
              {assignedUnits.map((unit) => {
                const isSelected = selectedUnitIds.includes(unit.id)
                const isDisabled = !isSelected && selectedUnitIds.length >= unitsToRemove

                return (
                  <label
                    key={unit.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                        : isDisabled
                        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUnit(unit.id)}
                      disabled={isDisabled}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {unit.assetTag || unit.serialNumber || `Unit #${unit.id.slice(-6)}`}
                      </div>
                      {unit.notes && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {unit.notes}
                        </div>
                      )}
                      {unit.assignment && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Assigned to: {unit.assignment.project?.name || 'Project'}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        unit.status === 'ASSIGNED'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {unit.status}
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedUnitIds.length !== unitsToRemove}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Remove {selectedUnitIds.length} Unit{selectedUnitIds.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

