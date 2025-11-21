'use client'

import { useState, useEffect } from 'react'
import { Phone, Mail, FileText, MessageSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatStatus } from '@/lib/status-colors'
import UserAvatar from './user-avatar'

interface ActivityItem {
  id: string
  type: 'communication' | 'milestone_comment' | 'status_change'
  communicationType?: string
  subject?: string | null
  content?: string
  direction?: string | null
  entityType?: string
  oldStatus?: string | null
  newStatus?: string
  createdAt: Date | string
  user: {
    id: string
    name: string | null
    email: string
  }
  project: {
    id: string
    name: string
  }
  milestone: {
    id: string
    name: string
  } | null
}

const communicationIcons = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: FileText,
  NOTE: FileText,
}

const communicationColors = {
  CALL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  EMAIL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  MEETING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  NOTE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

export default function DashboardActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard/activity')
      if (response.ok) {
        const data = await response.json()
        setActivities(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">Loading activity...</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {activities.map((item) => {
            if (item.type === 'status_change') {
              return (
                <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <ArrowRight className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          STATUS CHANGE
                        </span>
                        <Link 
                          href={`/dashboard/projects/${item.project.id}`}
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {item.project.name}
                        </Link>
                        {item.milestone && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            • {item.milestone.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{item.entityType === 'PROJECT' ? 'Project' : 'Milestone'}</span> status changed from{' '}
                        <span className="font-medium">{item.oldStatus ? formatStatus(item.oldStatus) : 'N/A'}</span> to{' '}
                        <span className="font-medium">{item.newStatus ? formatStatus(item.newStatus) : 'N/A'}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <UserAvatar
                          userId={item.user.id}
                          userName={item.user.name}
                          userEmail={item.user.email}
                          provider={(item.user as any).provider}
                          size={16}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.user.name || item.user.email} • {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            const Icon = communicationIcons[item.communicationType as keyof typeof communicationIcons] || FileText
            return (
              <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-3">
                  <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${communicationColors[item.communicationType as keyof typeof communicationColors] || communicationColors.NOTE}`}>
                        {item.communicationType}
                      </span>
                      {item.direction && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.direction}
                        </span>
                      )}
                      <Link 
                        href={`/dashboard/projects/${item.project.id}`}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {item.project.name}
                      </Link>
                      {item.milestone && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          • {item.milestone.name}
                        </span>
                      )}
                    </div>
                    {item.subject && (
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {item.subject}
                      </h4>
                    )}
                    {item.content && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-2">
                        {item.content}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.user.name || item.user.email} • {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

