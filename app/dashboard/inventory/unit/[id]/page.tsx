'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, Tag, Hash, Calendar, FileText, MapPin, Building2, AlertCircle, CheckCircle, Clock, XCircle, QrCode } from 'lucide-react'
import Link from 'next/link'

export default function InventoryUnitPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [unit, setUnit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUnit = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/inventory/units/${params.id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Inventory unit not found')
          } else if (response.status === 401) {
            setError('Unauthorized. Please log in to view this unit.')
          } else {
            setError('Failed to load inventory unit')
          }
          return
        }

        const data = await response.json()
        setUnit(data.unit)
      } catch (err) {
        console.error('Error fetching unit:', err)
        setError('An error occurred while loading the inventory unit')
      } finally {
        setLoading(false)
      }
    }

    fetchUnit()
  }, [params.id])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      AVAILABLE: {
        label: 'Available',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
        icon: CheckCircle,
      },
      ASSIGNED: {
        label: 'Assigned',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        icon: Clock,
      },
      USED: {
        label: 'Used',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
        icon: AlertCircle,
      },
      RETURNED: {
        label: 'Returned',
        color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
        icon: XCircle,
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
      icon: AlertCircle,
    }

    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading inventory unit...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !unit) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </Link>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {error || 'Unit not found'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'The inventory unit you are looking for does not exist or has been removed.'}
            </p>
            <Link
              href="/dashboard/inventory"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Inventory
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const inventoryItem = unit.inventoryItem
  const assignment = unit.assignment

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {inventoryItem.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Inventory Unit Details
              </p>
            </div>
            {getStatusBadge(unit.status)}
          </div>
        </div>

        <div className="space-y-6">
          {/* Unit Information Card */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Unit Information
              </h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {unit.assetTag && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-1">
                      <Tag className="w-4 h-4" />
                      Asset Tag
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {unit.assetTag}
                    </dd>
                  </div>
                )}
                {unit.serialNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-1">
                      <Hash className="w-4 h-4" />
                      Serial Number
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {unit.serialNumber}
                    </dd>
                  </div>
                )}
                {unit.dateReceived && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" />
                      Date Received
                    </dt>
                    <dd className="text-lg text-gray-900 dark:text-white">
                      {new Date(unit.dateReceived).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </dd>
                  </div>
                )}
                {unit.notes && (
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4" />
                      Notes
                    </dt>
                    <dd className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {unit.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Inventory Item Information Card */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Inventory Item
              </h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Item Name
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {inventoryItem.name}
                  </dd>
                </div>
                {inventoryItem.sku && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      SKU / Part Number
                    </dt>
                    <dd className="text-lg text-gray-900 dark:text-white">
                      {inventoryItem.sku}
                    </dd>
                  </div>
                )}
                {inventoryItem.location && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4" />
                      Location
                    </dt>
                    <dd className="text-lg text-gray-900 dark:text-white">
                      {inventoryItem.location}
                    </dd>
                  </div>
                )}
                {inventoryItem.distributor && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4" />
                      Distributor
                    </dt>
                    <dd className="text-lg text-gray-900 dark:text-white">
                      {inventoryItem.distributor}
                    </dd>
                  </div>
                )}
                {inventoryItem.description && (
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Description
                    </dt>
                    <dd className="text-gray-900 dark:text-white">
                      {inventoryItem.description}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Assignment Information Card */}
          {assignment && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Assignment
                </h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {assignment.project && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Project
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                        <Link
                          href={`/dashboard/projects/${assignment.project.id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {assignment.project.name}
                        </Link>
                      </dd>
                    </div>
                  )}
                  {assignment.assignedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4" />
                        Assigned At
                      </dt>
                      <dd className="text-lg text-gray-900 dark:text-white">
                        {new Date(assignment.assignedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}

          {/* QR Code Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  QR Code Scanned
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  This page was accessed by scanning the QR code on this inventory unit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

