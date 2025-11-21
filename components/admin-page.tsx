'use client'

import { useState, useEffect } from 'react'
import { Users, Activity, Database, Download, Upload, Cloud, Shield, Mail, Calendar, FileText, MessageSquare, ArrowRight, RefreshCw, X, Clock, Save, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import UserAvatar from './user-avatar'
import LabelSettings from './label-settings'

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
  const [showCloudRestore, setShowCloudRestore] = useState(false)
  const [cloudBackups, setCloudBackups] = useState<any[]>([])
  const [loadingCloudBackups, setLoadingCloudBackups] = useState(false)
  const [restoringFromCloud, setRestoringFromCloud] = useState<string | null>(null)
  const [backupSchedule, setBackupSchedule] = useState<any>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleFrequency, setScheduleFrequency] = useState('hourly')
  const [scheduleStartTime, setScheduleStartTime] = useState('')
  const [recentBackups, setRecentBackups] = useState<any[]>([])
  const [loadingRecentBackups, setLoadingRecentBackups] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchActivity()
    fetchBackupSchedule()
    fetchRecentBackups()
  }, [])

  const fetchBackupSchedule = async () => {
    try {
      const response = await fetch('/api/admin/backup-schedule')
      if (response.ok) {
        const data = await response.json()
        if (data.schedule) {
          setBackupSchedule(data.schedule)
          setScheduleEnabled(data.schedule.enabled)
          setScheduleFrequency(data.schedule.frequency)
          if (data.schedule.startTime) {
            const startDate = new Date(data.schedule.startTime)
            setScheduleStartTime(startDate.toISOString().slice(0, 16))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching backup schedule:', error)
    }
  }

  const fetchRecentBackups = async () => {
    setLoadingRecentBackups(true)
    try {
      const response = await fetch('/api/admin/sharepoint-backups')
      if (response.ok) {
        const data = await response.json()
        // Get all backups (both manual and scheduled) and take the latest 3
        // Backups are already sorted by createdDateTime desc from the API
        const allBackups = (data.backups || []).slice(0, 3)
        setRecentBackups(allBackups)
      } else {
        const error = await response.json()
        console.error('Error fetching recent backups:', error)
      }
    } catch (error) {
      console.error('Error fetching recent backups:', error)
    } finally {
      setLoadingRecentBackups(false)
    }
  }

  const handleSaveSchedule = async () => {
    setScheduleLoading(true)
    try {
      const response = await fetch('/api/admin/backup-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: scheduleEnabled,
          frequency: scheduleFrequency,
          startTime: scheduleStartTime || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setBackupSchedule(data.schedule)
        fetchRecentBackups() // Refresh recent backups
        alert('Backup schedule saved successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save backup schedule')
      }
    } catch (error) {
      console.error('Error saving backup schedule:', error)
      alert('Failed to save backup schedule')
    } finally {
      setScheduleLoading(false)
    }
  }

  const handleDeleteSchedule = async () => {
    if (!confirm('Are you sure you want to delete the backup schedule?')) {
      return
    }

    setScheduleLoading(true)
    try {
      const response = await fetch('/api/admin/backup-schedule', {
        method: 'DELETE',
      })

      if (response.ok) {
        setBackupSchedule(null)
        setScheduleEnabled(false)
        setScheduleFrequency('hourly')
        setScheduleStartTime('')
        alert('Backup schedule deleted successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete backup schedule')
      }
    } catch (error) {
      console.error('Error deleting backup schedule:', error)
      alert('Failed to delete backup schedule')
    } finally {
      setScheduleLoading(false)
    }
  }

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
          fetchRecentBackups() // Refresh recent backups if uploaded to SharePoint
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

  const fetchCloudBackups = async () => {
    setLoadingCloudBackups(true)
    try {
      const response = await fetch('/api/admin/sharepoint-backups')
      if (response.ok) {
        const data = await response.json()
        setCloudBackups(data.backups || [])
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to fetch backups from SharePoint')
      }
    } catch (error) {
      console.error('Error fetching cloud backups:', error)
      alert('Failed to fetch backups from SharePoint')
    } finally {
      setLoadingCloudBackups(false)
    }
  }

  const handleRestoreFromCloud = async (backupId: string, backupName: string) => {
    if (!confirm(`WARNING: This will replace the current database with "${backupName}". This action cannot be undone. Continue?`)) {
      return
    }

    setRestoringFromCloud(backupId)
    try {
      const response = await fetch(`/api/admin/sharepoint-backups/${backupId}/restore`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Database restored successfully from SharePoint!')
        setShowCloudRestore(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to restore from SharePoint backup')
      }
    } catch (error) {
      console.error('Error restoring from cloud:', error)
      alert('Failed to restore from SharePoint backup')
    } finally {
      setRestoringFromCloud(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
              {restoreLoading ? 'Restoring...' : 'Restore from File'}
              <input
                type="file"
                accept=".zip"
                onChange={handleRestore}
                disabled={restoreLoading}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                setShowCloudRestore(true)
                fetchCloudBackups()
              }}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
              <Cloud className="h-4 w-4" />
              Restore from Cloud
            </button>
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

      {/* Scheduled Backups Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduled Backups
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              Enable Scheduled Backups
            </label>
          </div>

          {scheduleEnabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequency
                  </label>
                  <select
                    value={scheduleFrequency}
                    onChange={(e) => setScheduleFrequency(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="10min">Every 10 Minutes</option>
                    <option value="30min">Every 30 Minutes</option>
                    <option value="hourly">Every Hour</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave empty to start immediately
                  </p>
                </div>
              </div>

              {backupSchedule && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Last Run:</strong>{' '}
                    {backupSchedule.lastRun
                      ? format(new Date(backupSchedule.lastRun), 'PPpp')
                      : 'Never'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Next Run:</strong>{' '}
                    {backupSchedule.nextRun
                      ? format(new Date(backupSchedule.nextRun), 'PPpp')
                      : 'Not scheduled'}
                  </p>
                  {backupSchedule.creator && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <strong>Created by:</strong> {backupSchedule.creator.name || backupSchedule.creator.email}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleSaveSchedule}
              disabled={scheduleLoading || !scheduleEnabled}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {scheduleLoading ? 'Saving...' : 'Save Schedule'}
            </button>
            {backupSchedule && (
              <button
                onClick={handleDeleteSchedule}
                disabled={scheduleLoading}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Schedule
              </button>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Scheduled backups will automatically be uploaded to SharePoint. Make sure you have Microsoft SSO configured and an admin user is signed in.
          </p>

          {/* Recent Successful Backups */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Latest Successful Backups
              </h3>
              <button
                onClick={fetchRecentBackups}
                disabled={loadingRecentBackups}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 disabled:opacity-50"
                title="Refresh backups list"
              >
                <RefreshCw className={`h-3 w-3 ${loadingRecentBackups ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            {loadingRecentBackups ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading backups...</span>
              </div>
            ) : recentBackups.length > 0 ? (
              <div className="space-y-2">
                {recentBackups.map((backup: any) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{backup.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatFileSize(backup.size)} • {format(new Date(backup.createdDateTime || backup.lastModifiedDateTime), 'PPpp')}
                      </div>
                    </div>
                    {backup.webUrl && (
                      <a
                        href={backup.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No backups found in SharePoint. Create a backup with "Upload to SharePoint" enabled.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cloud Restore Modal */}
      {showCloudRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Restore from SharePoint
              </h2>
              <button
                onClick={() => setShowCloudRestore(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingCloudBackups ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading backups...</span>
                </div>
              ) : cloudBackups.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No backups found in SharePoint. Create a backup with "Upload to SharePoint" enabled.
                </div>
              ) : (
                <div className="space-y-2">
                  {cloudBackups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{backup.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {formatFileSize(backup.size)} • {format(new Date(backup.createdDateTime), 'PPpp')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={backup.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleRestoreFromCloud(backup.id, backup.name)}
                          disabled={restoringFromCloud === backup.id}
                          className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
                        >
                          {restoringFromCloud === backup.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Restoring...
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3" />
                              Restore
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={fetchCloudBackups}
                disabled={loadingCloudBackups}
                className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingCloudBackups ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowCloudRestore(false)}
                className="rounded-md bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          userId={user.id}
                          userName={user.name}
                          userEmail={user.email}
                          provider={user.provider}
                          size={40}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || user.email}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
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

      {/* Label Settings Section */}
      <div className="mt-6">
        <LabelSettings />
      </div>
    </div>
  )
}

