'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Check, X, AlertTriangle, Box, Trash2 } from 'lucide-react'
import InventoryAssignmentForm from './inventory-assignment-form'

interface ProjectInventorySelectorProps {
  projectId: string
  jobType: string | null
  jobTypeId?: string | null
  onAssign?: () => void
}

export default function ProjectInventorySelector({
  projectId,
  jobType,
  jobTypeId,
  onAssign,
}: ProjectInventorySelectorProps) {
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [assigningItem, setAssigningItem] = useState<any>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [applyingPackage, setApplyingPackage] = useState(false)
  const [itemUnits, setItemUnits] = useState<Record<string, any[]>>({})
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [assignedInventory, setAssignedInventory] = useState<any[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  useEffect(() => {
    if (jobTypeId) {
      fetchInventoryForJobType()
      fetchPackages()
      fetchAssignedInventory()
    } else {
      setInventoryItems([])
      setPackages([])
      setAssignedInventory([])
    }
  }, [jobTypeId, projectId])

  const fetchInventoryForJobType = async () => {
    if (!jobTypeId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/inventory?jobTypeId=${jobTypeId}`)
      if (response.ok) {
        const data = await response.json()
        setInventoryItems(data.items || [])
        
        // Initialize quantities to 0
        const initialQuantities: Record<string, number> = {}
        data.items?.forEach((item: any) => {
          initialQuantities[item.id] = 0
        })
        setQuantities(initialQuantities)

        // Fetch units for items that track serial numbers
        const unitsMap: Record<string, any[]> = {}
        for (const item of data.items || []) {
          if (item.trackSerialNumbers) {
            try {
              const unitsResponse = await fetch(`/api/inventory/units?inventoryItemId=${item.id}`)
              if (unitsResponse.ok) {
                const unitsData = await unitsResponse.json()
                unitsMap[item.id] = unitsData.units || []
              }
            } catch (error) {
              console.error(`Error fetching units for item ${item.id}:`, error)
            }
          }
        }
        setItemUnits(unitsMap)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const fetchPackages = async () => {
    if (!jobTypeId) return

    try {
      const response = await fetch(`/api/inventory/packages?jobTypeId=${jobTypeId}`)
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
        // Set default package if available
        const defaultPackage = data.packages?.find((p: any) => p.isDefault)
        if (defaultPackage) {
          setSelectedPackage(defaultPackage.id)
        }
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
    }
  }

  const fetchAssignedInventory = async () => {
    if (!projectId) return

    setLoadingAssignments(true)
    try {
      const response = await fetch(`/api/inventory/assignments?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setAssignedInventory(data.assignments || [])
      }
    } catch (error) {
      console.error('Error fetching assigned inventory:', error)
    } finally {
      setLoadingAssignments(false)
    }
  }

  const handleUnassign = async (assignmentId: string, inventoryUnitId?: string) => {
    if (!confirm('Are you sure you want to remove this inventory item from the project?')) {
      return
    }

    try {
      const response = await fetch(`/api/inventory/assignments/${assignmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchAssignedInventory()
        fetchInventoryForJobType()
        if (onAssign) {
          onAssign()
        }
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to unassign inventory')
      }
    } catch (error) {
      console.error('Error unassigning inventory:', error)
      alert('Error unassigning inventory')
    }
  }

  const handleSelectPackage = async (packageId: string) => {
    setSelectedPackage(packageId)
    
    // Fetch package details and prefill quantities
    try {
      const response = await fetch(`/api/inventory/packages/${packageId}`)
      if (response.ok) {
        const data = await response.json()
        const packageData = data.package
        
        // Prefill quantities from package (but don't assign yet)
        const prefilledQuantities: Record<string, number> = {}
        packageData.items?.forEach((item: any) => {
          prefilledQuantities[item.inventoryItemId] = item.quantity
        })
        setQuantities(prefilledQuantities)
      }
    } catch (error) {
      console.error('Error fetching package:', error)
    }
  }

  const handleApplyPackage = async () => {
    if (!selectedPackage) {
      alert('Please select a package first')
      return
    }

    setApplyingPackage(true)
    try {
      const response = await fetch(`/api/inventory/packages/${selectedPackage}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to apply package')
      }

      const data = await response.json()
      alert(data.message || 'Package applied successfully')
      setQuantities({})
      if (onAssign) {
        onAssign()
      }
    } catch (error: any) {
      alert(error.message || 'Error applying package')
    } finally {
      setApplyingPackage(false)
    }
  }

  const handleQuantityChange = (itemId: string, value: number) => {
    const item = inventoryItems.find((i) => i.id === itemId)
    if (item && value >= 0 && value <= item.available) {
      setQuantities({ ...quantities, [itemId]: value })
    }
  }

  const handleAssignAll = async () => {
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
            projectId,
            quantity: quantities[item.id],
          }),
        })
      )

      await Promise.all(assignments)
      setQuantities({})
      fetchAssignedInventory()
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

  // Group assigned inventory by item
  const assignedByItem = assignedInventory.reduce((acc, assignment) => {
    const itemId = assignment.inventoryItemId
    if (!acc[itemId]) {
      acc[itemId] = {
        item: assignment.inventoryItem,
        assignments: [],
        totalQuantity: 0,
        units: [] as any[],
      }
    }
    acc[itemId].assignments.push(assignment)
    if (assignment.inventoryUnit) {
      acc[itemId].units.push(assignment.inventoryUnit)
    } else {
      acc[itemId].totalQuantity += assignment.quantity
    }
    return acc
  }, {} as Record<string, any>)

  if (!jobTypeId) {
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
      </div>

      {/* Assigned Inventory Section */}
      {Object.keys(assignedByItem).length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3">
            Assigned to This Project
          </h4>
          <div className="space-y-2">
            {Object.values(assignedByItem).map((group: any) => {
              const item = group.item
              const hasSerialUnits = group.units.length > 0

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </span>
                        {item.sku && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({item.sku})
                          </span>
                        )}
                      </div>
                      {hasSerialUnits ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {group.units.length} unit{group.units.length !== 1 ? 's' : ''} assigned:
                          </p>
                          <ul className="pl-4 space-y-1">
                            {group.units.map((unit: any) => {
                              const assignment = group.assignments.find(
                                (a: any) => a.inventoryUnitId === unit.id
                              )
                              return (
                                <li
                                  key={unit.id}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-gray-700 dark:text-gray-300">
                                    • {unit.assetTag || unit.serialNumber || `Unit #${unit.id.slice(-6)}`}
                                  </span>
                                  <button
                                    onClick={() => handleUnassign(assignment.id, unit.id)}
                                    className="ml-2 px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                    title="Remove from project"
                                  >
                                    Remove
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Quantity: {group.totalQuantity} {item.unit}
                          </span>
                          {group.assignments.map((assignment: any) => (
                            <button
                              key={assignment.id}
                              onClick={() => handleUnassign(assignment.id)}
                              className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                              title="Remove from project"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Package Selection */}
      {packages.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Box className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Project Packages
            </h4>
          </div>
          <p className="text-xs text-blue-800 dark:text-blue-400 mb-3">
            Select a package to automatically assign preset quantities of all inventory items.
          </p>
          <div className="space-y-2">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {pkg.name}
                    </span>
                    {pkg.isDefault && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {pkg.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {pkg.items.length} item{pkg.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <button
                    onClick={() => handleSelectPackage(pkg.id)}
                    className={`px-3 py-1.5 text-xs rounded ${
                      selectedPackage === pkg.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {selectedPackage === pkg.id ? 'Selected' : 'Select'}
                  </button>
                  {selectedPackage === pkg.id && (
                    <button
                      onClick={handleApplyPackage}
                      disabled={applyingPackage}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {applyingPackage ? 'Applying...' : 'Apply'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Inventory Selection */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Manual Inventory Selection
        </h4>
        <button
          onClick={handleAssignAll}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Assign Selected
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventoryItems.map((item) => {
          const isItemExpanded = expandedItems.has(item.id)
          const units = itemUnits[item.id] || []
          const hasUnits = item.trackSerialNumbers && units.length > 0
          const availableUnits = units.filter((u) => u.status === 'AVAILABLE')

          return (
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
                    {hasUnits && (
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <span className="text-xs">{isItemExpanded ? '▼' : '▶'}</span>
                      </button>
                    )}
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
                    {item.trackSerialNumbers ? `${availableUnits.length} unit${availableUnits.length !== 1 ? 's' : ''}` : `${item.available} ${item.unit}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <label className="text-xs text-gray-600 dark:text-gray-400 flex-1">
                    {item.trackSerialNumbers ? 'Select units:' : 'Quantity to assign:'}
                  </label>
                  {!item.trackSerialNumbers && (
                    <>
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
                    </>
                  )}
                  {item.trackSerialNumbers && (
                    <button
                      onClick={() => setAssigningItem(item)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Select Units
                    </button>
                  )}
                </div>
              </div>

              {/* Units List */}
              {isItemExpanded && hasUnits && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <ul className="space-y-1">
                    {units.map((unit) => (
                      <li
                        key={unit.id}
                        className={`flex items-center justify-between text-xs py-1 px-2 rounded ${
                          unit.status === 'ASSIGNED'
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : unit.status === 'USED'
                            ? 'bg-gray-100 dark:bg-gray-700'
                            : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">•</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {unit.serialNumber || `Unit #${unit.id.slice(-6)}`}
                          </span>
                          {unit.notes && (
                            <span className="text-gray-500 dark:text-gray-400 text-xs">
                              - {unit.notes}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            unit.status === 'AVAILABLE'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : unit.status === 'ASSIGNED'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {unit.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {item.distributor && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Distributor: {item.distributor}
                  </p>
                </div>
              )}
            </div>
          )
        })}
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

