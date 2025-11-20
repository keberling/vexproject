'use client'

import { useState, useEffect } from 'react'
import { Users, Activity, Database, Download, Upload, Cloud, Shield, Mail, Calendar, FileText, MessageSquare, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  provider: string | null
  createdAt: Date | string
  updatedAt: Date | string
  _count: {
    projects: number
    communications: number
    milestoneComments: number
    statusChanges: number
    calendarEvents: number
  }
}

interface ActivityItem {
  id: string
  type: string
  action: string
  description: string
  user: { id: string; name: string | null; email: string }
  project: { id: string; name: string } | null
  milestone: { id: string; name: string } | null
  createdAt: Date | string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [uploadToSharePoint, setUploadToSharePoint] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchActivity()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchActivity = async (userId?: string) => {
    try {
      const url = userId ? `/api/admin/activity?userId=${userId}` : '/api/admin/activity'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities)
      }
    } catch (error) {
      console.error('Error fetching activity:', error)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (response.ok) {
        fetchUsers()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update user role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update user role')
    }
  }

  const handleBackup = async () => {
    setBackupLoading(true)
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadToSharePoint }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = response.headers.get('X-Backup-Filename') || 'backup.zip'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        const sharepointUrl = response.headers.get('X-SharePoint-Url')
        if (sharepointUrl) {
          alert(`Backup created and uploaded to SharePoint!\n${sharepointUrl}`)
        } else {
          alert('Backup created successfully!')
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create backup')
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      alert('Failed to create backup')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!confirm('WARNING: This will replace the current database with the backup. This action cannot be undone. Continue?')) {
      return
    }

    setRestoreLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Database restored successfully! Please restart the server.')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to restore backup')
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      alert('Failed to restore backup')
    } finally {
      setRestoreLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const activityIcons = {
    communication: MessageSquare,
    status_change: ArrowRight,
    comment: MessageSquare,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Admin Dashboard
        </h1>
      </div>

      {/* Backup/Restore Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Backup & Restore
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackup}
              disabled={backupLoading}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {backupLoading ? 'Creating Backup...' : 'Create Backup'}
            </button>
            <label className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 cursor-pointer disabled:opacity-50">
              <Upload className="h-4 w-4" />
              {restoreLoading ? 'Restoring...' : 'Restore Backup'}
              <input
                type="file"
                accept=".zip"
                onChange={handleRestore}
                disabled={restoreLoading}
                className="hidden"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={uploadToSharePoint}
                onChange={(e) => setUploadToSharePoint(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Cloud className="h-4 w-4" />
              Upload to SharePoint
            </label>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create a backup of the entire database (zipped). Restore will replace the current database with the backup file.
          </p>
        </div>
      </div>

      {/* Users Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Users
        </h2>
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || user.email}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.provider || 'email'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col gap-1">
                        <span>{user._count.projects} projects</span>
                        <span>{user._count.communications + user._count.milestoneComments} notes</span>
                        <span>{user._count.calendarEvents} events</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </h2>
          <select
            value={selectedUserId || ''}
            onChange={(e) => {
              const userId = e.target.value || null
              setSelectedUserId(userId)
              fetchActivity(userId || undefined)
            }}
            className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No activity found</p>
          ) : (
            activities.map((activity) => {
              const Icon = activityIcons[activity.type as keyof typeof activityIcons] || Activity
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {activity.user.name || activity.user.email}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-gray-500 dark:text-gray-400">{activity.action}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activity.description}</p>
                    {activity.project && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Project: {activity.project.name}
                        {activity.milestone && ` • Milestone: ${activity.milestone.name}`}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

