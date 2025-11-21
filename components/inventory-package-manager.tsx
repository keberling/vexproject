'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Save, Edit2, Trash2, Package } from 'lucide-react'

interface InventoryPackageManagerProps {
  jobTypeId: string
  onClose: () => void
  onSave: () => void
}

export default function InventoryPackageManager({
  jobTypeId,
  onClose,
  onSave,
}: InventoryPackageManagerProps) {
  const [packages, setPackages] = useState<any[]>([])
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPackage, setEditingPackage] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    items: [] as Array<{ inventoryItemId: string; quantity: number }>,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [jobTypeId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [packagesRes, itemsRes] = await Promise.all([
        fetch(`/api/inventory/packages?jobTypeId=${jobTypeId}`),
        fetch(`/api/inventory?jobTypeId=${jobTypeId}`),
      ])

      if (packagesRes.ok) {
        const data = await packagesRes.json()
        setPackages(data.packages || [])
      }

      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setInventoryItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPackage(null)
    setFormData({
      name: '',
      description: '',
      isDefault: false,
      items: [],
    })
    setError('')
  }

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      isDefault: pkg.isDefault || false,
      items: pkg.items.map((item: any) => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
      })),
    })
    setError('')
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Package name is required')
      return
    }

    try {
      const url = editingPackage
        ? `/api/inventory/packages/${editingPackage.id}`
        : '/api/inventory/packages'
      const method = editingPackage ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          jobTypeId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save package')
      }

      setEditingPackage(null)
      setFormData({
        name: '',
        description: '',
        isDefault: false,
        items: [],
      })
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Error saving package')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) {
      return
    }

    try {
      const response = await fetch(`/api/inventory/packages/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchData()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete package')
      }
    } catch (error) {
      console.error('Error deleting package:', error)
      alert('Error deleting package')
    }
  }

  const addItemToPackage = () => {
    if (inventoryItems.length === 0) return
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          inventoryItemId: inventoryItems[0].id,
          quantity: 1,
        },
      ],
    })
  }

  const removeItemFromPackage = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...formData.items]
    newItems[index].quantity = quantity
    setFormData({ ...formData, items: newItems })
  }

  const updateItemSelection = (index: number, inventoryItemId: string) => {
    const newItems = [...formData.items]
    newItems[index].inventoryItemId = inventoryItemId
    setFormData({ ...formData, items: newItems })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Manage Packages
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Package Form */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {editingPackage ? 'Edit Package' : 'Create New Package'}
            </h3>
            {error && (
              <div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      Default Package
                    </span>
                  </label>
                </div>
              </div>
              <div>
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

              {/* Package Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Package Items
                  </label>
                  <button
                    type="button"
                    onClick={addItemToPackage}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <select
                        value={item.inventoryItemId}
                        onChange={(e) => updateItemSelection(index, e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">Select Item</option>
                        {inventoryItems.map((invItem) => (
                          <option key={invItem.id} value={invItem.id}>
                            {invItem.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeItemFromPackage(index)}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                      No items in package. Click "Add Item" to add inventory items.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  <Save className="h-3 w-3" />
                  {editingPackage ? 'Update' : 'Create'}
                </button>
                {editingPackage && (
                  <button
                    onClick={handleCreate}
                    className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Packages List */}
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
              Loading...
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Existing Packages ({packages.length})
              </h3>
              {packages.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No packages yet. Create one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex items-start justify-between p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {pkg.name}
                          </h4>
                          {pkg.isDefault && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {pkg.description}
                          </p>
                        )}
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          {pkg.items.length} item{pkg.items.length !== 1 ? 's' : ''}:
                          {pkg.items.map((item: any, idx: number) => (
                            <span key={idx} className="ml-2">
                              {item.inventoryItem.name} ({item.quantity})
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
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

