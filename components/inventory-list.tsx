'use client'

import { useState } from 'react'
import { Edit2, Trash2, Package, AlertTriangle, ExternalLink, Phone, Mail, Plus } from 'lucide-react'
import InventoryAssignmentForm from './inventory-assignment-form'

interface InventoryListProps {
  items: any[]
  onEdit: (item: any) => void
  onDelete: (id: string) => void
  onRefresh: () => void
}

export default function InventoryList({ items, onEdit, onDelete, onRefresh }: InventoryListProps) {
  const [assigningItem, setAssigningItem] = useState<any>(null)

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No inventory items found.</p>
        <p className="text-sm mt-2">Click "Add Item" to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Item
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Job Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              SKU / Part #
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Available
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Distributor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Order Info
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item) => (
            <tr
              key={item.id}
              className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                item.isLowStock ? 'bg-red-50 dark:bg-red-900/10' : ''
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </div>
                      {item.isLowStock && (
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    {item.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {item.description}
                      </div>
                    )}
                    {item.category && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {item.category}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {item.jobType || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {item.sku || item.partNumber || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  <div className="font-medium">{item.quantity} {item.unit}</div>
                  {item.threshold > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Threshold: {item.threshold}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div
                  className={`text-sm font-medium ${
                    item.isLowStock
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.available} {item.unit}
                </div>
                {item.assigned > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.assigned} assigned
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 dark:text-white">
                  {item.distributor || item.supplier || '-'}
                </div>
                {item.distributorContact && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.distributorContact}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  {item.orderLink && (
                    <a
                      href={item.orderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Order Link
                    </a>
                  )}
                  {item.orderPhone && (
                    <a
                      href={`tel:${item.orderPhone}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {item.orderPhone}
                    </a>
                  )}
                  {item.orderEmail && (
                    <a
                      href={`mailto:${item.orderEmail}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {item.orderEmail}
                    </a>
                  )}
                  {!item.orderLink && !item.orderPhone && !item.orderEmail && (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setAssigningItem(item)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                    title="Assign to project"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {assigningItem && (
        <InventoryAssignmentForm
          inventoryItem={assigningItem}
          onClose={() => setAssigningItem(null)}
          onSave={() => {
            setAssigningItem(null)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

