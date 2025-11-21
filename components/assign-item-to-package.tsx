'use client'

import { useState, useEffect } from 'react'
import { X, Save, Package } from 'lucide-react'

interface AssignItemToPackageProps {
  inventoryItem: any
  onClose: () => void
  onSave: () => void
}

export default function AssignItemToPackage({
  inventoryItem,
  onClose,
  onSave,
}: AssignItemToPackageProps) {
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchPackages()
  }, [inventoryItem])

  const fetchPackages = async () => {
    if (!inventoryItem?.jobTypeId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/packages?jobTypeId=${inventoryItem.jobTypeId}`)
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
        
        // Initialize quantities - check if item is already in package
        const initialQuantities: Record<string, number> = {}
        data.packages?.forEach((pkg: any) => {
          const existingItem = pkg.items.find((item: any) => item.inventoryItemId === inventoryItem.id)
          initialQuantities[pkg.id] = existingItem ? existingItem.quantity : 1
        })
        setQuantities(initialQuantities)
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!inventoryItem?.jobTypeId) {
      setError('Item must have a job type assigned first')
      return
    }

    setAssigning(true)
    setError('')

    try {
      // Get packages that have a quantity set
      const packagesToUpdate = packages.filter((pkg) => quantities[pkg.id] > 0)

      if (packagesToUpdate.length === 0) {
        setError('Please set quantities for at least one package')
        setAssigning(false)
        return
      }

      // Update each package
      const promises = packagesToUpdate.map(async (pkg) => {
        // Check if item already exists in package
        const existingItem = pkg.items.find((item: any) => item.inventoryItemId === inventoryItem.id)
        
        if (existingItem) {
          // Update existing package item
          const updatedItems = pkg.items.map((item: any) =>
            item.inventoryItemId === inventoryItem.id
              ? { ...item, quantity: quantities[pkg.id] }
              : item
          )
          
          return fetch(`/api/inventory/packages/${pkg.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: pkg.name,
              description: pkg.description,
              isDefault: pkg.isDefault,
              items: updatedItems.map((item: any) => ({
                inventoryItemId: item.inventoryItemId,
                quantity: item.quantity,
              })),
            }),
          })
        } else {
          // Add new item to package
          const updatedItems = [
            ...pkg.items.map((item: any) => ({
              inventoryItemId: item.inventoryItemId,
              quantity: item.quantity,
            })),
            {
              inventoryItemId: inventoryItem.id,
              quantity: quantities[pkg.id],
            },
          ]

          return fetch(`/api/inventory/packages/${pkg.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: pkg.name,
              description: pkg.description,
              isDefault: pkg.isDefault,
              items: updatedItems,
            }),
          })
        }
      })

      const results = await Promise.all(promises)
      const failed = results.find((r) => !r.ok)

      if (failed) {
        const data = await failed.json()
        throw new Error(data.error || 'Failed to update some packages')
      }

      onSave()
    } catch (err: any) {
      setError(err.message || 'Error assigning item to packages')
    } finally {
      setAssigning(false)
    }
  }

  if (!inventoryItem?.jobTypeId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Assign to Package
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-400">
              This item must have a job type assigned before it can be added to packages.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Assign {inventoryItem.name} to Packages
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Loading packages...
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p className="mb-2">No packages found for this job type.</p>
              <p className="text-sm">Create packages in the inventory page first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set the quantity for this item in each package:
              </p>
              {packages.map((pkg) => {
                const existingItem = pkg.items.find((item: any) => item.inventoryItemId === inventoryItem.id)
                return (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {pkg.name}
                        </span>
                        {pkg.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                            Default
                          </span>
                        )}
                        {existingItem && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            (Currently: {existingItem.quantity})
                          </span>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {pkg.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <label className="text-xs text-gray-600 dark:text-gray-400">Qty:</label>
                      <input
                        type="number"
                        min="0"
                        value={quantities[pkg.id] || 0}
                        onChange={(e) =>
                          setQuantities({
                            ...quantities,
                            [pkg.id]: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {inventoryItem.unit}
                      </span>
                    </div>
                  </div>
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
            {packages.length > 0 && (
              <button
                onClick={handleAssign}
                disabled={assigning || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {assigning ? 'Assigning...' : 'Assign to Packages'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

