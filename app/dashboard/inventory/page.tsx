'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, AlertTriangle, Search, Filter } from 'lucide-react'
import InventoryList from '@/components/inventory-list'
import InventoryForm from '@/components/inventory-form'

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (showLowStockOnly) {
        params.append('lowStockOnly', 'true')
      }
      if (filterCategory) {
        params.append('category', filterCategory)
      }

      const response = await fetch(`/api/inventory?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(data.items?.map((item: any) => item.category).filter(Boolean) || [])
        ) as string[]
        setCategories(uniqueCategories)
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

  useEffect(() => {
    fetchItems()
    fetchLowStock()
  }, [showLowStockOnly, filterCategory])

  const handleCreate = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingItem(null)
    fetchItems()
    fetchLowStock()
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

  // Filter items by search term
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="h-8 w-8" />
                Inventory Management
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Manage your global inventory and track items assigned to projects
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">
                {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below threshold
              </span>
            </div>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              {lowStockItems.slice(0, 5).map((item) => (
                <span key={item.id} className="mr-4">
                  {item.name} ({item.available} available, threshold: {item.threshold})
                </span>
              ))}
              {lowStockItems.length > 5 && (
                <span className="text-red-600 dark:text-red-400">
                  ...and {lowStockItems.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Low Stock Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Low Stock Only
              </span>
            </label>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading inventory...
            </div>
          ) : (
            <InventoryList
              items={filteredItems}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={fetchItems}
            />
          )}
        </div>
      </div>

      {/* Inventory Form Modal */}
      {showForm && (
        <InventoryForm
          item={editingItem}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}
    </div>
  )
}

