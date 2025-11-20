'use client'

import { useState } from 'react'
import { ProjectFile, Milestone } from '@prisma/client'
import { Download, Trash2, File, Filter, X } from 'lucide-react'

interface FileListProps {
  files: (ProjectFile & {
    milestone: Milestone | null
  })[]
  milestones: Milestone[]
  onDelete: () => void
}

export default function FileList({ files, milestones, onDelete }: FileListProps) {
  const [filterMilestoneId, setFilterMilestoneId] = useState<string | null>(null)

  const filteredFiles = filterMilestoneId
    ? files.filter(file => file.milestoneId === filterMilestoneId)
    : files

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      onDelete()
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Files</h2>
        <div className="flex items-center gap-2">
          {filterMilestoneId && (
            <button
              onClick={() => setFilterMilestoneId(null)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-3 w-3" />
              Clear filter
            </button>
          )}
          <select
            value={filterMilestoneId || ''}
            onChange={(e) => setFilterMilestoneId(e.target.value || null)}
            className="text-xs rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
          >
            <option value="">All files</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name} ({files.filter(f => f.milestoneId === milestone.id).length})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        {filteredFiles.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {filterMilestoneId ? 'No files for this milestone' : 'No files uploaded yet.'}
          </p>
        ) : (
          filteredFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <File className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                  {file.milestone && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {file.milestone.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={file.fileUrl}
                download
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => handleDelete(file.id)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  )
}

