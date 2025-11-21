'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Check, X, AlertTriangle } from 'lucide-react'
import InventoryAssignmentForm from './inventory-assignment-form'

interface ProjectInventorySelectorProps {
  projectId: string
  jobType: string | null
  milestoneId?: string
  onAssign?: () => void
}

export default function ProjectInventorySelector({
  projectId,
  jobType,
  milestoneId,
  onAssign,
}: ProjectInventorySelectorProps) {
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [assigningItem, setAssigningItem] = useState<any>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    if (jobType) {
      fetchInventoryForJobType()
    } else {
      setInventoryItems([])
    }
  }, [jobType])

  const fetchInventoryForJobType = async () => {
    if (!jobType) return

    setLoading(true)
    try {
      const response = await fetch(`/api/inventory/job-types?jobType=${encodeURIComponent(jobType)}`)
      if (response.ok) {
        const data = await response.json()
        setInventoryItems(data.items || [])
        
        // Initialize quantities to 0
        const initialQuantities: Record<string, number> = {}
        data.items?.forEach((item: any) => {
          initialQuantities[item.id] = 0
        })
        setQuantities(initialQuantities)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = (itemId: string, value: number) => {
    const item = inventoryItems.find((i) => i.id === itemId)
    if (item && value >= 0 && value <= item.available) {
      setQuantities({ ...quantities, [itemId]: value })
    }
  }

  const handleAssignAll = async () => {
    if (!milestoneId) {
      alert('Please select a milestone first')
      return
    }

    const itemsToAssign = inventoryItems.filter(
      (item) => quantities[item.id] > 0
    )

    if (itemsToAssign.length === 0) {
      alert('Please set quantities for items to assign')
      return
    }

    setLoading(true)
    try {
      const assignments = itemsToAssign.map((item) =>
        fetch('/api/inventory/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inventoryItemId: item.id,
            milestoneId,
            quantity: quantities[item.id],
          }),
        })
      )

      await Promise.all(assignments)
      setQuantities({})
      if (onAssign) {
        onAssign()
      }
    } catch (error) {
      console.error('Error assigning inventory:', error)
      alert('Error assigning inventory')
    } finally {
      setLoading(false)
    }
  }

  if (!jobType) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a job type to view available inventory</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading inventory for {jobType}...
      </div>
    )
  }

  if (inventoryItems.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No inventory items found for job type: {jobType}</p>
        <p className="text-xs mt-1">Add items to inventory and assign them to this job type</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Inventory for {jobType}
        </h3>
        {milestoneId && (
          <button
            onClick={handleAssignAll}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Assign Selected
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventoryItems.map((item) => (
          <div
            key={item.id}
            className={`p-4 border rounded-lg ${
              item.isLowStock
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </h4>
                  {item.isLowStock && (
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                {item.sku && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    SKU: {item.sku}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Available:</span>
                <span
                  className={
                    item.isLowStock
                      ? 'font-medium text-red-600 dark:text-red-400'
                      : 'font-medium text-gray-900 dark:text-white'
                  }
                >
                  {item.available} {item.unit}
                </span>
              </div>

              {milestoneId ? (
                <div className="flex items-center gap-2 mt-3">
                  <label className="text-xs text-gray-600 dark:text-gray-400 flex-1">
                    Quantity to assign:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={item.available}
                    value={quantities[item.id] || 0}
                    onChange={(e) =>
                      handleQuantityChange(item.id, parseInt(e.target.value) || 0)
                    }
                    className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.unit}
                  </span>
                </div>
              ) : (
                <div className="mt-2">
                  <button
                    onClick={() => setAssigningItem(item)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    <Plus className="h-4 w-4" />
                    Assign to Milestone
                  </button>
                </div>
              )}
            </div>

            {item.distributor && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Distributor: {item.distributor}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {assigningItem && (
        <InventoryAssignmentForm
          inventoryItem={assigningItem}
          projectId={projectId}
          onClose={() => setAssigningItem(null)}
          onSave={() => {
            setAssigningItem(null)
            fetchInventoryForJobType()
            if (onAssign) {
              onAssign()
            }
          }}
        />
      )}
    </div>
  )
}

