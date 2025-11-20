'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'

interface FileUploadProps {
  projectId: string
  onUpload: () => void
}

export default function FileUpload({ projectId, onUpload }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setError('')
    setUploading(true)

    // Upload files sequentially to avoid overwhelming the server
    for (const file of fileArray) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', projectId)

        const response = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(`${file.name}: ${data.error || 'Failed to upload file'}`)
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
      } catch (err: any) {
        setError(prev => prev ? `${prev}\n${err.message}` : err.message)
        setUploadProgress(prev => ({ ...prev, [file.name]: -1 })) // -1 indicates error
      }
    }

    // Clear progress after a short delay
    setTimeout(() => {
      setUploadProgress({})
    }, 2000)

    onUpload()
    setUploading(false)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await handleFiles(files)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await handleFiles(files)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upload Files</h2>
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div className="flex items-center justify-center w-full">
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className={`w-8 h-8 mb-2 transition-colors ${
                isDragging 
                  ? 'text-blue-500 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`} />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Multiple files supported</p>
            </div>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
              multiple
            />
          </label>
        </div>
      </div>
      {uploading && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Uploading files...</p>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="w-full">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span className="truncate flex-1">{fileName}</span>
                <span>{progress === -1 ? 'Failed' : progress === 100 ? 'Complete' : `${progress}%`}</span>
              </div>
              {progress !== -1 && progress !== 100 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Files are automatically uploaded to SharePoint if Microsoft SSO is configured. Otherwise, files are stored locally.
      </p>
    </div>
  )
}

