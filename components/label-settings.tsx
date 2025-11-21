'use client'

import { useState, useEffect } from 'react'
import { Save, Printer, Settings } from 'lucide-react'

export default function LabelSettings() {
  const [settings, setSettings] = useState({
    labelWidth: 4.0,
    labelHeight: 2.0,
    qrCodeSize: 200,
    fontSize: 12,
    showItemName: true,
    showAssetTag: true,
    showSerialNumber: true,
    showQRCode: true,
    labelTemplate: '',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/label-settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings({
            labelWidth: data.settings.labelWidth || 4.0,
            labelHeight: data.settings.labelHeight || 2.0,
            qrCodeSize: data.settings.qrCodeSize || 200,
            fontSize: data.settings.fontSize || 12,
            showItemName: data.settings.showItemName !== undefined ? data.settings.showItemName : true,
            showAssetTag: data.settings.showAssetTag !== undefined ? data.settings.showAssetTag : true,
            showSerialNumber: data.settings.showSerialNumber !== undefined ? data.settings.showSerialNumber : true,
            showQRCode: data.settings.showQRCode !== undefined ? data.settings.showQRCode : true,
            labelTemplate: data.settings.labelTemplate || '',
          })
        }
      }
    } catch (error) {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/admin/label-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setSuccess('Settings saved successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save settings')
      }
    } catch (error) {
      setError('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Label & QR Code Settings
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure how inventory labels and QR codes are printed
        </p>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-800 dark:text-green-400">
            {success}
          </div>
        )}

        {/* Label Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Label Width (inches)
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="10"
              value={settings.labelWidth}
              onChange={(e) => setSettings({ ...settings, labelWidth: parseFloat(e.target.value) || 4.0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Label Height (inches)
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="10"
              value={settings.labelHeight}
              onChange={(e) => setSettings({ ...settings, labelHeight: parseFloat(e.target.value) || 2.0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* QR Code Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              QR Code Size (pixels)
            </label>
            <input
              type="number"
              min="50"
              max="500"
              value={settings.qrCodeSize}
              onChange={(e) => setSettings({ ...settings, qrCodeSize: parseInt(e.target.value) || 200 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Size (points)
            </label>
            <input
              type="number"
              min="8"
              max="24"
              value={settings.fontSize}
              onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) || 12 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Display Options</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showQRCode}
                onChange={(e) => setSettings({ ...settings, showQRCode: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show QR Code</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showItemName}
                onChange={(e) => setSettings({ ...settings, showItemName: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Item Name</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showAssetTag}
                onChange={(e) => setSettings({ ...settings, showAssetTag: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Asset Tag / Inventory Number</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showSerialNumber}
                onChange={(e) => setSettings({ ...settings, showSerialNumber: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Serial Number (if available)</span>
            </label>
          </div>
        </div>

        {/* Custom Template (Advanced) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom Label Template (HTML/CSS) - Optional
          </label>
          <textarea
            value={settings.labelTemplate}
            onChange={(e) => setSettings({ ...settings, labelTemplate: e.target.value })}
            rows={6}
            placeholder="Enter custom HTML/CSS template for labels..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Leave empty to use default template. Use variables: {'{itemName}'}, {'{assetTag}'}, {'{serialNumber}'}, {'{qrCode}'}
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

