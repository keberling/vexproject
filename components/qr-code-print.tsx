'use client'

import { useState, useEffect } from 'react'
import { X, Printer, Download, QrCode } from 'lucide-react'

interface QRCodePrintProps {
  unit: {
    id: string
    assetTag: string | null
    serialNumber: string | null
    inventoryItem: {
      id: string
      name: string
      sku: string | null
    }
  }
  settings?: {
    labelWidth?: number
    labelHeight?: number
    qrCodeSize?: number
    fontSize?: number
    showItemName?: boolean
    showAssetTag?: boolean
    showSerialNumber?: boolean
    showQRCode?: boolean
  }
  onClose: () => void
}

export default function QRCodePrint({ unit, settings, onClose }: QRCodePrintProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const defaultSettings = {
    labelWidth: 4.0,
    labelHeight: 2.0,
    qrCodeSize: 200,
    fontSize: 12,
    showItemName: true,
    showAssetTag: true,
    showSerialNumber: true,
    showQRCode: true,
    ...settings,
  }

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const response = await fetch(`/api/inventory/units/${unit.id}/qr`)
        if (response.ok) {
          const data = await response.json()
          setQrCodeDataUrl(data.qrCode)
        } else {
          setError('Failed to generate QR code')
        }
      } catch (err) {
        setError('Error generating QR code')
      } finally {
        setLoading(false)
      }
    }

    fetchQRCode()
  }, [unit.id])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Label - ${unit.assetTag || unit.id}</title>
          <style>
            @media print {
              @page {
                size: ${defaultSettings.labelWidth}in ${defaultSettings.labelHeight}in;
                margin: 0.1in;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: ${defaultSettings.labelWidth}in;
              height: ${defaultSettings.labelHeight}in;
              padding: 0.1in;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
            }
            .qr-code {
              max-width: ${defaultSettings.qrCodeSize}px;
              max-height: ${defaultSettings.qrCodeSize}px;
            }
            .item-name {
              font-size: ${defaultSettings.fontSize}pt;
              font-weight: bold;
              margin: 0.1in 0;
            }
            .asset-tag {
              font-size: ${defaultSettings.fontSize + 2}pt;
              font-weight: bold;
              margin: 0.05in 0;
            }
            .serial-number {
              font-size: ${defaultSettings.fontSize - 2}pt;
              color: #666;
              margin: 0.05in 0;
            }
          </style>
        </head>
        <body>
          ${defaultSettings.showQRCode && qrCodeDataUrl ? `<div class="qr-container"><img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" /></div>` : ''}
          ${defaultSettings.showItemName ? `<div class="item-name">${unit.inventoryItem.name}</div>` : ''}
          ${defaultSettings.showAssetTag && unit.assetTag ? `<div class="asset-tag">${unit.assetTag}</div>` : ''}
          ${defaultSettings.showSerialNumber && unit.serialNumber ? `<div class="serial-number">S/N: ${unit.serialNumber}</div>` : ''}
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleDownload = () => {
    if (!qrCodeDataUrl) return

    const link = document.createElement('a')
    link.download = `inventory-label-${unit.assetTag || unit.id}.png`
    link.href = qrCodeDataUrl
    link.click()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Print Inventory Label
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Generating QR code...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-400">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-center space-y-2">
                  {defaultSettings.showQRCode && qrCodeDataUrl && (
                    <div className="mb-4">
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code"
                        className="mx-auto"
                        style={{ maxWidth: `${defaultSettings.qrCodeSize}px`, maxHeight: `${defaultSettings.qrCodeSize}px` }}
                      />
                    </div>
                  )}
                  {defaultSettings.showItemName && (
                    <div className="font-semibold text-gray-900 dark:text-white" style={{ fontSize: `${defaultSettings.fontSize}pt` }}>
                      {unit.inventoryItem.name}
                    </div>
                  )}
                  {defaultSettings.showAssetTag && unit.assetTag && (
                    <div className="font-bold text-gray-900 dark:text-white" style={{ fontSize: `${defaultSettings.fontSize + 2}pt` }}>
                      {unit.assetTag}
                    </div>
                  )}
                  {defaultSettings.showSerialNumber && unit.serialNumber && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      S/N: {unit.serialNumber}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4" />
                  Print Label
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

