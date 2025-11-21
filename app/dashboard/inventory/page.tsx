'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, AlertTriangle, Search, Edit2, Trash2, Settings, Box, Download, Upload, QrCode } from 'lucide-react'
import InventoryForm from '@/components/inventory-form'
import JobTypeManager from '@/components/job-type-manager'
import InventoryPackageManager from '@/components/inventory-package-manager'
import InventoryUnitForm from '@/components/inventory-unit-form'
import AssignItemToPackage from '@/components/assign-item-to-package'
import AssignUnitToProject from '@/components/assign-unit-to-project'
import QRCodePrint from '@/components/qr-code-print'

export default function InventoryPage() {
  const [jobTypes, setJobTypes] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showJobTypeManager, setShowJobTypeManager] = useState(false)
  const [showPackageManager, setShowPackageManager] = useState(false)
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [showAssignToPackage, setShowAssignToPackage] = useState(false)
  const [showAssignUnitToProject, setShowAssignUnitToProject] = useState(false)
  const [unitFormItem, setUnitFormItem] = useState<any>(null)
  const [assignToPackageItem, setAssignToPackageItem] = useState<any>(null)
  const [assignUnitToProjectUnit, setAssignUnitToProjectUnit] = useState<any>(null)
  const [packageManagerJobTypeId, setPackageManagerJobTypeId] = useState<string | null>(null)
  const [showQRPrint, setShowQRPrint] = useState(false)
  const [qrPrintUnit, setQrPrintUnit] = useState<any>(null)
  const [labelSettings, setLabelSettings] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [selectedJobTypeId, setSelectedJobTypeId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedJobTypes, setExpandedJobTypes] = useState<Set<string>>(new Set())
  const [itemUnits, setItemUnits] = useState<Record<string, any[]>>({})
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)

  const fetchJobTypes = async () => {
    try {
      const response = await fetch('/api/job-types')
      if (response.ok) {
        const data = await response.json()
        setJobTypes(data.jobTypes || [])
        // Expand all job types by default
        setExpandedJobTypes(new Set(data.jobTypes?.map((jt: any) => jt.id) || []))
      }
    } catch (error) {
      console.error('Error fetching job types:', error)
    }
  }

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/inventory')
      if (response.ok) {
        const data = await response.json()
        
        // Fetch units for all items (tracking is always enabled)
        const unitsMap: Record<string, any[]> = {}
        for (const item of data.items || []) {
          try {
            const unitsResponse = await fetch(`/api/inventory/units?inventoryItemId=${item.id}`)
            if (unitsResponse.ok) {
              const unitsData = await unitsResponse.json()
              const units = unitsData.units || []
              unitsMap[item.id] = units
              
              // Recalculate available based on actual units
              const availableUnits = units.filter((u: any) => u.status === 'AVAILABLE').length
              const assignedUnits = units.filter((u: any) => u.status === 'ASSIGNED' || u.status === 'USED').length
              
              // Update item with recalculated values
              const itemIndex = data.items.findIndex((i: any) => i.id === item.id)
              if (itemIndex >= 0) {
                data.items[itemIndex].quantity = units.length
                data.items[itemIndex].available = availableUnits
                data.items[itemIndex].assigned = assignedUnits
                data.items[itemIndex].isLowStock = availableUnits < (item.threshold || 0)
              }
            }
          } catch (error) {
            console.error(`Error fetching units for item ${item.id}:`, error)
          }
        }
        setItems(data.items || [])
        setItemUnits(unitsMap)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLowStock = async () => {
    try {
      const response = await fetch('/api/inventory/low-stock')
      if (response.ok) {
        const data = await response.json()
        setLowStockItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching low stock items:', error)
    }
  }

  const fetchLabelSettings = async () => {
    try {
      const response = await fetch('/api/admin/label-settings')
      if (response.ok) {
        const data = await response.json()
        setLabelSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching label settings:', error)
    }
  }

  useEffect(() => {
    fetchJobTypes()
    fetchItems()
    fetchLowStock()
    fetchLabelSettings()
  }, [])

  const handleCreate = (jobTypeId?: string | null) => {
    setEditingItem(null)
    setSelectedJobTypeId(jobTypeId || null)
    setShowForm(true)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setSelectedJobTypeId(item.jobTypeId || null)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingItem(null)
    setSelectedJobTypeId(null)
    fetchItems()
    fetchJobTypes()
    fetchLowStock()
  }

  const handleAddUnits = (item: any) => {
    setUnitFormItem(item)
    setShowUnitForm(true)
  }

  const handleUnitFormClose = () => {
    setShowUnitForm(false)
    setUnitFormItem(null)
    fetchItems()
  }

  const handleAssignToPackage = (item: any) => {
    setAssignToPackageItem(item)
    setShowAssignToPackage(true)
  }

  const handleAssignToPackageClose = () => {
    setShowAssignToPackage(false)
    setAssignToPackageItem(null)
    // Refresh to show updated package data
    fetchItems()
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/inventory/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to export inventory')
      }
    } catch (error) {
      console.error('Error exporting inventory:', error)
      alert('Error exporting inventory')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/inventory/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || 'Import completed successfully')
        fetchItems()
        fetchLowStock()
      } else {
        alert(data.error || 'Failed to import inventory')
      }
    } catch (error) {
      console.error('Error importing inventory:', error)
      alert('Error importing inventory')
    } finally {
      setImporting(false)
      // Reset file input
      e.target.value = ''
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) {
      return
    }

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchItems()
        fetchLowStock()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error deleting item')
    }
  }

  const toggleJobType = (jobTypeId: string) => {
    setExpandedJobTypes((prev) => {
      const next = new Set(prev)
      if (next.has(jobTypeId)) {
        next.delete(jobTypeId)
      } else {
        next.add(jobTypeId)
      }
      return next
    })
  }

  // Group items by job type
  const itemsByJobType = items.reduce((acc, item) => {
    const key = item.jobTypeId || 'unassigned'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {} as Record<string, any[]>)

  // Filter items by search term
  const filterItems = (items: any[]) => {
    if (!searchTerm) return items
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="h-6 w-6" />
                Inventory Management
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/inventory/template"
                download="inventory-import-template.csv"
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Template
              </a>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
                <Upload className="h-4 w-4" />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
              <button
                onClick={() => setShowJobTypeManager(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Manage Job Types
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={() => handleCreate()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">
                {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below threshold
              </span>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Inventory by Job Type */}
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            Loading inventory...
          </div>
        ) : (
          <div className="space-y-3">
            {/* Uncategorized items */}
            {filterItems(itemsByJobType['unassigned'] || []).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => toggleJobType('unassigned')}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {expandedJobTypes.has('unassigned') ? '▼' : '▶'}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Uncategorized
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({filterItems(itemsByJobType['unassigned'] || []).length} items)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreate(null)
                      }}
                      className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      + Add
                    </button>
                  </div>
                </div>
                {expandedJobTypes.has('unassigned') && (
                  <div className="p-2">
                    <div className="grid grid-cols-1 gap-1">
                      {filterItems(itemsByJobType['unassigned'] || []).map((item) => {
                        const isItemExpanded = expandedItems.has(item.id)
                        const units = itemUnits[item.id] || []
                        const hasUnits = units.length > 0

                        return (
                          <div
                            key={item.id}
                            className={`rounded text-xs ${
                              item.isLowStock ? 'bg-red-50 dark:bg-red-900/10' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {hasUnits && (
                                    <button
                                      onClick={() => toggleItem(item.id)}
                                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                      <span className="text-xs">{isItemExpanded ? '▼' : '▶'}</span>
                                    </button>
                                  )}
                                  <span className="font-medium text-gray-900 dark:text-white truncate">
                                    {item.name}
                                  </span>
                                  {item.isLowStock && (
                                    <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                                  )}
                                  {item.sku && (
                                    <span className="text-gray-500 dark:text-gray-400">
                                      ({item.sku})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-gray-600 dark:text-gray-400">
                                  <span>
                                    Qty: {item.quantity} {item.unit}
                                  </span>
                                  <span className={item.isLowStock ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                                    Available: {item.available} {item.unit}
                                  </span>
                                  {item.threshold > 0 && (
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Threshold: {item.threshold}
                                    </span>
                                  )}
                                  {hasUnits && (
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {units.length} unit{units.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                {item.jobTypeId && (
                                  <button
                                    onClick={() => handleAssignToPackage(item)}
                                    className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                                    title="Assign to Package"
                                  >
                                    <Box className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAddUnits(item)}
                                  className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                  title="Add Units"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            {isItemExpanded && hasUnits && (
                              <div className="pl-6 pr-2 pb-2">
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
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className="text-gray-400">•</span>
                                        <div className="flex items-center gap-3 flex-1">
                                          {unit.assetTag ? (
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Asset Tag:</span>
                                              <span className="font-semibold text-gray-900 dark:text-white">
                                                {unit.assetTag}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">No Asset Tag</span>
                                          )}
                                          {unit.serialNumber && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Serial:</span>
                                              <span className="text-gray-700 dark:text-gray-300">
                                                {unit.serialNumber}
                                              </span>
                                            </div>
                                          )}
                                          {!unit.assetTag && !unit.serialNumber && (
                                            <span className="text-gray-500 dark:text-gray-400 text-xs italic">
                                              Unit #{unit.id.slice(-6)}
                                            </span>
                                          )}
                                        </div>
                                        {unit.notes && (
                                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                                            - {unit.notes}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            setQrPrintUnit({
                                              id: unit.id,
                                              assetTag: unit.assetTag,
                                              serialNumber: unit.serialNumber,
                                              inventoryItem: {
                                                id: item.id,
                                                name: item.name,
                                                sku: item.sku,
                                              },
                                            })
                                            setShowQRPrint(true)
                                          }}
                                          className="px-2 py-0.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                                          title="Print QR Code Label"
                                        >
                                          <QrCode className="h-3 w-3" />
                                          Print QR
                                        </button>
                                        {unit.status === 'AVAILABLE' && (
                                          <button
                                            onClick={() => {
                                              setAssignUnitToProjectUnit(unit)
                                              setShowAssignUnitToProject(true)
                                            }}
                                            className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                            title="Assign to Project"
                                          >
                                            Assign
                                          </button>
                                        )}
                                        {unit.status === 'ASSIGNED' && (
                                          <button
                                            onClick={async () => {
                                              if (confirm('Are you sure you want to unassign this unit from the project?')) {
                                                try {
                                                  // Find the assignment for this unit
                                                  let assignmentId = unit.assignment?.id
                                                  
                                                  // If assignment not loaded, fetch it by asset tag or unit ID
                                                  if (!assignmentId) {
                                                    // Try to find by asset tag first (preferred method)
                                                    if (unit.assetTag) {
                                                      const assignmentResponse = await fetch(`/api/inventory/assignments?assetTag=${encodeURIComponent(unit.assetTag)}`)
                                                      if (assignmentResponse.ok) {
                                                        const assignmentData = await assignmentResponse.json()
                                                        const assignment = assignmentData.assignments?.find((a: any) => 
                                                          a.inventoryUnit?.assetTag === unit.assetTag
                                                        )
                                                        assignmentId = assignment?.id
                                                      }
                                                    }
                                                    
                                                    // Fallback to finding by unit ID
                                                    if (!assignmentId) {
                                                      const assignmentResponse = await fetch(`/api/inventory/assignments?inventoryItemId=${item.id}`)
                                                      if (assignmentResponse.ok) {
                                                        const assignmentData = await assignmentResponse.json()
                                                        const assignment = assignmentData.assignments?.find((a: any) => a.inventoryUnitId === unit.id)
                                                        assignmentId = assignment?.id
                                                      }
                                                    }
                                                  }
                                                  
                                                  // If no assignment found, just reset the unit status to AVAILABLE
                                                  if (!assignmentId) {
                                                    // Reset unit status directly
                                                    const resetResponse = await fetch(`/api/inventory/units/${unit.id}`, {
                                                      method: 'PUT',
                                                      headers: {
                                                        'Content-Type': 'application/json',
                                                      },
                                                      body: JSON.stringify({ status: 'AVAILABLE' }),
                                                    })
                                                    if (resetResponse.ok) {
                                                      fetchItems()
                                                    } else {
                                                      alert('Failed to reset unit status')
                                                    }
                                                    return
                                                  }
                                                  
                                                  const response = await fetch(`/api/inventory/assignments/${assignmentId}`, {
                                                    method: 'DELETE',
                                                  })
                                                  if (response.ok) {
                                                    fetchItems()
                                                  } else {
                                                    alert('Failed to unassign unit')
                                                  }
                                                } catch (error) {
                                                  console.error('Error unassigning unit:', error)
                                                  alert('Error unassigning unit')
                                                }
                                              }
                                            }}
                                            className="px-2 py-0.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                            title="Unassign from Project"
                                          >
                                            Unassign
                                          </button>
                                        )}
                                        {unit.status === 'AVAILABLE' && (
                                          <button
                                            onClick={async () => {
                                              if (confirm('Are you sure you want to delete this unit? This cannot be undone.')) {
                                                try {
                                                  const response = await fetch(`/api/inventory/units/${unit.id}`, {
                                                    method: 'DELETE',
                                                  })
                                                  if (response.ok) {
                                                    fetchItems()
                                                  } else {
                                                    const data = await response.json()
                                                    alert(data.error || 'Failed to delete unit')
                                                  }
                                                } catch (error) {
                                                  console.error('Error deleting unit:', error)
                                                  alert('Error deleting unit')
                                                }
                                              }
                                            }}
                                            className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                            title="Delete Unit"
                                          >
                                            Delete
                                          </button>
                                        )}
                                        <div className="flex items-center gap-2">
                                          {unit.status === 'ASSIGNED' && unit.assignment?.project && (
                                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                              → {unit.assignment.project.name}
                                            </span>
                                          )}
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
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Items grouped by job type */}
            {jobTypes.map((jobType) => {
              const jobTypeItems = filterItems(itemsByJobType[jobType.id] || [])
              if (jobTypeItems.length === 0 && !searchTerm) return null

              const isExpanded = expandedJobTypes.has(jobType.id)

              return (
                <div
                  key={jobType.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => toggleJobType(jobType.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {jobType.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({jobTypeItems.length} items)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPackageManagerJobTypeId(jobType.id)
                          setShowPackageManager(true)
                        }}
                        className="text-xs px-2 py-0.5 bg-purple-600 text-white rounded hover:bg-purple-700"
                        title="Manage Packages"
                      >
                        Packages
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCreate(jobType.id)
                        }}
                        className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="p-2">
                      <div className="grid grid-cols-1 gap-1">
                        {jobTypeItems.map((item) => {
                          const isItemExpanded = expandedItems.has(item.id)
                          const units = itemUnits[item.id] || []
                          const hasUnits = units.length > 0

                          return (
                            <div
                              key={item.id}
                              className={`rounded text-xs ${
                                item.isLowStock ? 'bg-red-50 dark:bg-red-900/10' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {hasUnits && (
                                      <button
                                        onClick={() => toggleItem(item.id)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                      >
                                        <span className="text-xs">{isItemExpanded ? '▼' : '▶'}</span>
                                      </button>
                                    )}
                                    <span className="font-medium text-gray-900 dark:text-white truncate">
                                      {item.name}
                                    </span>
                                    {item.isLowStock && (
                                      <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                                    )}
                                    {item.sku && (
                                      <span className="text-gray-500 dark:text-gray-400">
                                        ({item.sku})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 text-gray-600 dark:text-gray-400">
                                    <span>
                                      Qty: {item.quantity} {item.unit}
                                    </span>
                                    <span className={item.isLowStock ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                                      Available: {item.available} {item.unit}
                                    </span>
                                    {item.threshold > 0 && (
                                      <span className="text-gray-500 dark:text-gray-400">
                                        Threshold: {item.threshold}
                                      </span>
                                    )}
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {units.length} unit{units.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  {item.jobTypeId && (
                                    <button
                                      onClick={() => handleAssignToPackage(item)}
                                      className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                                      title="Assign to Package"
                                    >
                                      <Box className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleAddUnits(item)}
                                    className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                    title="Add Units"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(item)}
                                    className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {isItemExpanded && hasUnits && (
                                <div className="pl-6 pr-2 pb-2">
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
                                            {unit.assetTag || unit.serialNumber || `Unit #${unit.id.slice(-6)}`}
                                          </span>
                                          {unit.notes && (
                                            <span className="text-gray-500 dark:text-gray-400 text-xs">
                                              - {unit.notes}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => {
                                              setQrPrintUnit({
                                                id: unit.id,
                                                assetTag: unit.assetTag,
                                                serialNumber: unit.serialNumber,
                                                inventoryItem: {
                                                  id: item.id,
                                                  name: item.name,
                                                  sku: item.sku,
                                                },
                                              })
                                              setShowQRPrint(true)
                                            }}
                                            className="px-2 py-0.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                                            title="Print QR Code Label"
                                          >
                                            <QrCode className="h-3 w-3" />
                                            Print QR
                                          </button>
                                          {unit.status === 'AVAILABLE' && (
                                            <button
                                              onClick={() => {
                                                setAssignUnitToProjectUnit(unit)
                                                setShowAssignUnitToProject(true)
                                              }}
                                              className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                              title="Assign to Project"
                                            >
                                              Assign
                                            </button>
                                          )}
                                          {unit.status === 'ASSIGNED' && (
                                            <button
                                              onClick={async () => {
                                                if (confirm('Are you sure you want to unassign this unit from the project?')) {
                                                  try {
                                                    // Find the assignment for this unit
                                                    let assignmentId = unit.assignment?.id
                                                    
                                                    // If assignment not loaded, fetch it
                                                    if (!assignmentId) {
                                                      const assignmentResponse = await fetch(`/api/inventory/assignments?inventoryItemId=${item.id}`)
                                                      if (assignmentResponse.ok) {
                                                        const assignmentData = await assignmentResponse.json()
                                                        const assignment = assignmentData.assignments?.find((a: any) => a.inventoryUnitId === unit.id)
                                                        assignmentId = assignment?.id
                                                      }
                                                    }
                                                    
                                                    if (!assignmentId) {
                                                      alert('Could not find assignment for this unit')
                                                      return
                                                    }
                                                    
                                                    const response = await fetch(`/api/inventory/assignments/${assignmentId}`, {
                                                      method: 'DELETE',
                                                    })
                                                    if (response.ok) {
                                                      fetchItems()
                                                    } else {
                                                      alert('Failed to unassign unit')
                                                    }
                                                  } catch (error) {
                                                    console.error('Error unassigning unit:', error)
                                                    alert('Error unassigning unit')
                                                  }
                                                }
                                              }}
                                              className="px-2 py-0.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                              title="Unassign from Project"
                                            >
                                              Unassign
                                            </button>
                                          )}
                                          {unit.status === 'AVAILABLE' && (
                                            <button
                                              onClick={async () => {
                                                if (confirm('Are you sure you want to delete this unit? This cannot be undone.')) {
                                                  try {
                                                    const response = await fetch(`/api/inventory/units/${unit.id}`, {
                                                      method: 'DELETE',
                                                    })
                                                    if (response.ok) {
                                                      fetchItems()
                                                    } else {
                                                      const data = await response.json()
                                                      alert(data.error || 'Failed to delete unit')
                                                    }
                                                  } catch (error) {
                                                    console.error('Error deleting unit:', error)
                                                    alert('Error deleting unit')
                                                  }
                                                }
                                              }}
                                              className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                              title="Delete Unit"
                                            >
                                              Delete
                                            </button>
                                          )}
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
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

          </div>
        )}
      </div>

      {/* Inventory Form Modal */}
      {showForm && (
        <InventoryForm
          item={editingItem}
          defaultJobTypeId={selectedJobTypeId}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}

      {/* Job Type Manager Modal */}
      {showJobTypeManager && (
        <JobTypeManager
          onClose={() => setShowJobTypeManager(false)}
          onSave={() => {
            setShowJobTypeManager(false)
            fetchJobTypes()
          }}
        />
      )}

      {/* Package Manager Modal */}
      {showPackageManager && packageManagerJobTypeId && (
        <InventoryPackageManager
          jobTypeId={packageManagerJobTypeId}
          onClose={() => {
            setShowPackageManager(false)
            setPackageManagerJobTypeId(null)
          }}
          onSave={() => {
            setShowPackageManager(false)
            setPackageManagerJobTypeId(null)
          }}
        />
      )}

      {/* Unit Form Modal */}
      {showUnitForm && unitFormItem && (
        <InventoryUnitForm
          inventoryItemId={unitFormItem.id}
          inventoryItemName={unitFormItem.name}
          onClose={handleUnitFormClose}
          onSave={handleUnitFormClose}
        />
      )}

      {/* Assign to Package Modal */}
      {showAssignToPackage && assignToPackageItem && (
        <AssignItemToPackage
          inventoryItem={assignToPackageItem}
          onClose={handleAssignToPackageClose}
          onSave={handleAssignToPackageClose}
        />
      )}

      {/* Assign Unit to Project Modal */}
      {showAssignUnitToProject && assignUnitToProjectUnit && (
        <AssignUnitToProject
          unit={assignUnitToProjectUnit}
          onClose={() => {
            setShowAssignUnitToProject(false)
            setAssignUnitToProjectUnit(null)
            fetchItems()
          }}
          onSave={() => {
            setShowAssignUnitToProject(false)
            setAssignUnitToProjectUnit(null)
            fetchItems()
          }}
        />
      )}

      {/* QR Code Print Modal */}
      {showQRPrint && qrPrintUnit && (
        <QRCodePrint
          unit={qrPrintUnit}
          settings={labelSettings}
          onClose={() => {
            setShowQRPrint(false)
            setQrPrintUnit(null)
          }}
        />
      )}
    </div>
  )
}
