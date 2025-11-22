'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Check, X, AlertTriangle, Box, Trash2, Calendar } from 'lucide-react'
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

        // Fetch units for items
        const unitsMap: Record<string, any[]> = {}
        for (const item of data.items || []) {
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
        setItemUnits(unitsMap)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPackages = async () => {
    if (!jobTypeId) return

    try {
      const response = await fetch(`/api/inventory/packages?jobTypeId=${jobTypeId}`)
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
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
    
    try {
      const response = await fetch(`/api/inventory/packages/${packageId}`)
      if (response.ok) {
        const data = await response.json()
        const packageData = data.package
        
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
      fetchAssignedInventory()
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

  const handleUpdateAssignment = async (assignmentId: string, updates: any) => {
    try {
      const response = await fetch(`/api/inventory/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        fetchAssignedInventory()
        if (onAssign) {
          onAssign()
        }
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update assignment')
      }
    } catch (error) {
      console.error('Error updating assignment:', error)
      alert('Error updating assignment')
    }
  }

  // Group assigned inventory by item
  const assignedByItem = assignedInventory.reduce((acc, assignment) => {
    const itemId = assignment.inventoryItemId
    if (!acc[itemId]) {
      acc[itemId] = {
        item: assignment.inventoryItem,
        assignments: [],
        units: [] as any[],
      }
    }
    acc[itemId].assignments.push(assignment)
    if (assignment.inventoryUnit) {
      acc[itemId].units.push({
        unit: assignment.inventoryUnit,
        assignment,
      })
    }
    return acc
  }, {} as Record<string, any>)


  if (!jobTypeId) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400 text-sm">
        <Package className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p>Select a job type to view available inventory</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        Loading inventory for {jobType}...
      </div>
    )
  }

  if (inventoryItems.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400 text-sm">
        <Package className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p>No inventory items found for job type: {jobType}</p>
        <p className="text-xs mt-1">Add items to inventory and assign them to this job type</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Package Selection - Compact */}
      {packages.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
          <div className="flex items-center gap-2 mb-2">
            <Box className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-300">Packages:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {packages.map((pkg) => (
              <div key={pkg.id} className="flex items-center gap-1">
                <button
                  onClick={() => handleSelectPackage(pkg.id)}
                  className={`px-2 py-0.5 text-xs rounded ${
                    selectedPackage === pkg.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {pkg.name}{pkg.isDefault && ' (Default)'}
                </button>
                {selectedPackage === pkg.id && (
                  <button
                    onClick={handleApplyPackage}
                    disabled={applyingPackage}
                    className="px-2 py-0.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {applyingPackage ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simplified List View */}
      <div className="space-y-1">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 pb-1 border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-3">Product</div>
          <div className="col-span-2">Assigned</div>
          <div className="col-span-1 text-center">QC</div>
          <div className="col-span-1 text-center">Config</div>
          <div className="col-span-2">Shipped</div>
          <div className="col-span-3">Actions</div>
        </div>

        {/* Inventory Items List */}
        {inventoryItems.flatMap((item) => {
          const assigned = assignedByItem[item.id]
          const units = itemUnits[item.id] || []
          const availableUnits = units.filter((u: any) => u.status === 'AVAILABLE')
          const isAssigned = assigned && (assigned.units.length > 0 || assigned.assignments.some((a: any) => a.quantity > 0))
          
          // Determine status color
          let statusColor = 'yellow' // not assigned
          if (isAssigned) {
            statusColor = 'green' // assigned
          } else if (units.length > 0 && availableUnits.length === 0) {
            statusColor = 'red' // out of stock but needed
          }

          // Get status indicator
          const getStatusIndicator = () => {
            if (statusColor === 'red') {
              return <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
            } else if (statusColor === 'green') {
              return <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            } else {
              return <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
            }
          }

          // If assigned, render each assignment as a separate row
          if (assigned && assigned.assignments.length > 0) {
            return assigned.assignments.map((assignment: any) => {
              const unit = assignment.inventoryUnit
              const hasUnit = !!unit
              
              return (
                <div
                  key={assignment.id}
                  className={`grid grid-cols-12 gap-2 items-center py-1.5 px-2 text-xs rounded ${
                    statusColor === 'green'
                      ? 'bg-green-50 dark:bg-green-900/10'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  {/* Product Name */}
                  <div className="col-span-3 flex items-center gap-1.5">
                    {getStatusIndicator()}
                    <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                    {item.sku && (
                      <span className="text-gray-500 dark:text-gray-400">({item.sku})</span>
                    )}
                  </div>

                  {/* Assigned Unit/Quantity */}
                  <div className="col-span-2">
                    {hasUnit ? (
                      <span className="text-gray-700 dark:text-gray-300">
                        {unit.assetTag || unit.serialNumber || `Unit #${unit.id.slice(-6)}`}
                      </span>
                    ) : assignment.quantity > 0 ? (
                      <span className="text-gray-700 dark:text-gray-300">
                        {assignment.quantity} {item.unit}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </div>

                  {/* Quality Control Checkbox */}
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={assignment.qualityControl || false}
                      onChange={(e) => handleUpdateAssignment(assignment.id, { qualityControl: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* Configured Checkbox */}
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={assignment.configured || false}
                      onChange={(e) => handleUpdateAssignment(assignment.id, { configured: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* Shipped Date */}
                  <div className="col-span-2 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!assignment.shippedDate}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleUpdateAssignment(assignment.id, { shippedDate: new Date().toISOString() })
                        } else {
                          handleUpdateAssignment(assignment.id, { shippedDate: null })
                        }
                      }}
                      className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    {assignment.shippedDate && (
                      <input
                        type="date"
                        value={assignment.shippedDate ? new Date(assignment.shippedDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleUpdateAssignment(assignment.id, { shippedDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="flex-1 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-center gap-1">
                    <button
                      onClick={() => handleUnassign(assignment.id, assignment.inventoryUnitId)}
                      className="px-1.5 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })
          }

          // If not assigned, render single row for unassigned item
          return [
            <div
              key={item.id}
              className={`grid grid-cols-12 gap-2 items-center py-1.5 px-2 text-xs rounded ${
                statusColor === 'red'
                  ? 'bg-red-50 dark:bg-red-900/10'
                  : 'bg-gray-50 dark:bg-gray-800'
              }`}
            >
              {/* Product Name */}
              <div className="col-span-3 flex items-center gap-1.5">
                {getStatusIndicator()}
                <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                {item.sku && (
                  <span className="text-gray-500 dark:text-gray-400">({item.sku})</span>
                )}
              </div>

              {/* Assigned - Empty */}
              <div className="col-span-2">
                <span className="text-gray-400 dark:text-gray-500">—</span>
              </div>

              {/* Quality Control - Empty */}
              <div className="col-span-1 flex justify-center">
                <span className="text-gray-300 dark:text-gray-600">—</span>
              </div>

              {/* Configured - Empty */}
              <div className="col-span-1 flex justify-center">
                <span className="text-gray-300 dark:text-gray-600">—</span>
              </div>

              {/* Shipped - Empty */}
              <div className="col-span-2">
                <span className="text-gray-300 dark:text-gray-600">—</span>
              </div>

              {/* Actions */}
              <div className="col-span-3 flex items-center gap-1">
                {units.length > 0 ? (
                  <button
                    onClick={() => setAssigningItem(item)}
                    className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Assign Unit
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max={item.available}
                      value={quantities[item.id] || 0}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                      className="w-12 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.unit}</span>
                  </div>
                )}
              </div>
            </div>
          ]
        })}
      </div>

      {/* Assign Selected Button */}
      {Object.values(quantities).some(qty => qty > 0) && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleAssignAll}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Check className="h-3 w-3" />
            Assign Selected
          </button>
        </div>
      )}

      {assigningItem && (
        <InventoryAssignmentForm
          inventoryItem={assigningItem}
          projectId={projectId}
          onClose={() => setAssigningItem(null)}
          onSave={() => {
            setAssigningItem(null)
            fetchInventoryForJobType()
            fetchAssignedInventory()
            if (onAssign) {
              onAssign()
            }
          }}
        />
      )}
    </div>
  )
}
