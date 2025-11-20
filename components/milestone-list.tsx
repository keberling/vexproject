'use client'

import { useState, useEffect, useRef } from 'react'
import { Milestone, ProjectFile, MilestoneComment, Task, TaskComment } from '@prisma/client'
import { Plus, Trash2, Check, Clock, AlertCircle, Calendar, Pause, Paperclip, MessageSquare, ChevronDown, ChevronUp, Upload, Download, File, X, Phone, Mail, FileText, Image as ImageIcon, Folder, Cloud, User, Star, Edit } from 'lucide-react'
import { createConfetti } from '@/lib/confetti'
import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import UserAvatar from './user-avatar'

interface MilestoneListProps {
  projectId: string
  milestones: (Milestone & {
    comments?: (MilestoneComment & {
      user: {
        id: string
        name: string | null
        email: string
      }
    })[]
    tasks?: (Task & {
      assignedTo: {
        id: string
        name: string | null
        email: string
        provider: string | null
      } | null
      comments: (TaskComment & {
        user: {
          id: string
          name: string | null
          email: string
          provider: string | null
        }
      })[]
    })[]
  })[]
  onUpdate: () => void
}

// Helper function to record communication from milestone
export async function recordMilestoneCommunication(
  projectId: string,
  milestoneId: string,
  type: 'CALL' | 'EMAIL' | 'NOTE',
  content: string,
  direction?: 'INBOUND' | 'OUTBOUND',
  subject?: string
) {
  const response = await fetch('/api/communications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      subject: subject || null,
      content,
      direction: direction || null,
      projectId,
      milestoneId,
    }),
  })
  return response
}

const statusIcons = {
  PENDING: Clock,
  PENDING_WAITING_FOR_INFO: AlertCircle,
  PENDING_SCHEDULED: Calendar,
  IN_PROGRESS: Clock,
  COMPLETED: Check,
  ON_HOLD: Pause,
}

const statusColors = {
  PENDING: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  PENDING_WAITING_FOR_INFO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  PENDING_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ON_HOLD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
}

const statusLabels = {
  PENDING: 'Pending',
  PENDING_WAITING_FOR_INFO: 'Waiting for Info',
  PENDING_SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
}

const taskStatusIcons = {
  PENDING: Clock,
  IN_PROGRESS: Clock,
  COMPLETED: Check,
  ON_HOLD: Pause,
}

const taskStatusColors = {
  PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ON_HOLD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
}

const taskStatusLabels = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
}

export default function MilestoneList({ projectId, milestones, onUpdate }: MilestoneListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})
  const [milestoneFiles, setMilestoneFiles] = useState<Record<string, ProjectFile[]>>({})
  const [milestoneComments, setMilestoneComments] = useState<Record<string, (MilestoneComment & {
    user: {
      id: string
      name: string | null
      email: string
    }
  })[]>>({})
  const [milestoneCommunications, setMilestoneCommunications] = useState<Record<string, Array<{
    id: string
    type: string
    subject: string | null
    content: string
    direction: string | null
    createdAt: Date | string
    user: {
      id: string
      name: string | null
      email: string
    }
  }>>>({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    isImportant: false,
    dueDate: '',
  })
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Record<string, {
    name: string
    description: string
    category: string
    isImportant: boolean
    dueDate: string
  }>>({})
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([])
  const [showCategorySuggestions, setShowCategorySuggestions] = useState<Record<string, boolean>>({})
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Get existing categories from milestones
  const getExistingCategories = (): string[] => {
    const categories = new Set<string>()
    milestones.forEach(m => {
      const category = (m as any).category
      if (category && category.trim()) {
        categories.add(category.trim())
      }
    })
    return Array.from(categories).sort()
  }

  // Expand all categories by default on mount
  useEffect(() => {
    if (milestones.length > 0) {
      const categories = new Set<string>()
      milestones.forEach(m => {
        const category = (m as any).category || 'Uncategorized'
        categories.add(category)
      })
      setExpandedCategories(categories)
    }
  }, [milestones.length]) // Only run when milestone count changes
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [tasks, setTasks] = useState<Record<string, (Task & {
    assignedTo: {
      id: string
      name: string | null
      email: string
      provider: string | null
    } | null
    comments: (TaskComment & {
      user: {
        id: string
        name: string | null
        email: string
        provider: string | null
      }
    })[]
  })[]>>({})
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [taskCommentTexts, setTaskCommentTexts] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string; provider: string | null }>>([])
  const [taskFormData, setTaskFormData] = useState<Record<string, { name: string; description: string; dueDate: string; assignedToId: string; isImportant: boolean }>>({})
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState<Record<string, boolean>>({})
  const [taskFiles, setTaskFiles] = useState<Record<string, Array<{ id: string; name: string; fileName: string; fileUrl: string; fileType: string; fileSize: number; thumbnailUrl: string | null }>>>({})
  const [uploadingTaskFiles, setUploadingTaskFiles] = useState<Record<string, boolean>>({})
  const localTaskUpdates = useRef<Set<string>>(new Set()) // Track milestones with local task updates

  // Calculate milestone progress based on tasks, or status if no tasks
  const calculateMilestoneProgress = (milestone: Milestone & { category?: string | null; isImportant?: boolean }): number => {
    const milestoneTasks = tasks[milestone.id] || []
    
    // If there are tasks, calculate based on task completion
    if (milestoneTasks.length > 0) {
      const completedTasks = milestoneTasks.filter(t => t.status === 'COMPLETED').length
      return Math.round((completedTasks / milestoneTasks.length) * 100)
    }
    
    // If no tasks, calculate based on milestone status
    const statusProgressMap: Record<string, number> = {
      'PENDING': 0,
      'PENDING_WAITING_FOR_INFO': 10,
      'PENDING_SCHEDULED': 20,
      'IN_PROGRESS': 50,
      'ON_HOLD': 30,
      'COMPLETED': 100,
    }
    
    return statusProgressMap[milestone.status] || 0
  }

  // Calculate task status breakdown for colored progress bar
  const getTaskStatusBreakdown = (milestoneId: string): { completed: number; inProgress: number; pending: number; total: number } => {
    const milestoneTasks = tasks[milestoneId] || []
    if (milestoneTasks.length === 0) {
      return { completed: 0, inProgress: 0, pending: 0, total: 0 }
    }
    
    return {
      completed: milestoneTasks.filter(t => t.status === 'COMPLETED').length,
      inProgress: milestoneTasks.filter(t => t.status === 'IN_PROGRESS').length,
      pending: milestoneTasks.filter(t => t.status === 'PENDING' || t.status === 'ON_HOLD').length,
      total: milestoneTasks.length,
    }
  }

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }
    fetchUsers()
  }, [])

  // Pre-load comments and communications for all milestones on mount
  useEffect(() => {
    const loadAllMilestoneData = async () => {
      const commentsMap: Record<string, (MilestoneComment & {
        user: {
          id: string
          name: string | null
          email: string
        }
      })[]> = {}
      const communicationsMap: Record<string, Array<{
        id: string
        type: string
        subject: string | null
        content: string
        direction: string | null
        createdAt: Date | string
        user: {
          id: string
          name: string | null
          email: string
        }
      }>> = {}

      // Use pre-loaded comments from props if available, otherwise fetch
      for (const milestone of milestones) {
        const milestoneWithData = milestone as any
        if (milestoneWithData.comments && Array.isArray(milestoneWithData.comments)) {
          commentsMap[milestone.id] = milestoneWithData.comments
        } else {
          try {
            const commentsResponse = await fetch(`/api/milestones/${milestone.id}/comments`)
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json()
              commentsMap[milestone.id] = commentsData.comments || []
            }
          } catch (error) {
            console.error(`Error fetching comments for milestone ${milestone.id}:`, error)
            commentsMap[milestone.id] = []
          }
        }

        // Fetch communications for this milestone
        try {
          const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestone.id}`)
          if (commsResponse.ok) {
            const commsData = await commsResponse.json()
            communicationsMap[milestone.id] = (commsData.communications || []).map((comm: any) => ({
              id: comm.id,
              type: comm.type,
              subject: comm.subject,
              content: comm.content,
              direction: comm.direction,
              createdAt: comm.createdAt,
              user: comm.user,
            }))
          }
        } catch (error) {
          console.error(`Error fetching communications for milestone ${milestone.id}:`, error)
          communicationsMap[milestone.id] = []
        }
      }
      setMilestoneComments(commentsMap)
      setMilestoneCommunications(communicationsMap)
    }

    loadAllMilestoneData()
  }, [milestones, projectId])

  // Sync tasks from props - but don't overwrite if we have recent local updates
  useEffect(() => {
    const newTasksMap: Record<string, (Task & {
      assignedTo: {
        id: string
        name: string | null
        email: string
        provider: string | null
      } | null
      comments: (TaskComment & {
        user: {
          id: string
          name: string | null
          email: string
          provider: string | null
        }
      })[]
    })[]> = {}

    for (const milestone of milestones) {
      const milestoneWithData = milestone as any
      
      // If we have local updates for this milestone, merge carefully instead of overwriting
      if (localTaskUpdates.current.has(milestone.id)) {
        // Keep local state, but merge in any new tasks from props
        const currentTasks = tasks[milestone.id] || []
        const propTasks = milestoneWithData.tasks && Array.isArray(milestoneWithData.tasks) 
          ? milestoneWithData.tasks 
          : []
        
        // Create a map of current tasks by ID
        const taskMap = new Map(currentTasks.map(t => [t.id, t]))
        
        // Update existing tasks with prop data (for status, etc.) but keep local structure
        propTasks.forEach((propTask: any) => {
          const existing = taskMap.get(propTask.id)
          if (existing) {
            // Merge prop data into existing task
            taskMap.set(propTask.id, { ...existing, ...propTask })
          } else {
            // New task from props
            taskMap.set(propTask.id, propTask)
          }
        })
        
        newTasksMap[milestone.id] = Array.from(taskMap.values())
        
        // Check if our local updates are now reflected in props
        const currentTaskIds = new Set(currentTasks.map(t => t.id))
        const propTaskIds = new Set(propTasks.map((t: any) => t.id))
        const allLocalTasksInProps = Array.from(currentTaskIds).every(id => propTaskIds.has(id))
        
        // Only clear flag if props have caught up with our changes
        if (allLocalTasksInProps && currentTaskIds.size === propTaskIds.size) {
          localTaskUpdates.current.delete(milestone.id)
        }
      } else if (milestoneWithData.tasks && Array.isArray(milestoneWithData.tasks)) {
        // No local updates, use props directly
        newTasksMap[milestone.id] = milestoneWithData.tasks
      } else {
        // Keep existing tasks if no tasks in props
        newTasksMap[milestone.id] = tasks[milestone.id] || []
      }
    }

    // Only update if there are actual changes
    const hasChanges = Object.keys(newTasksMap).some(milestoneId => {
      const newTasks = newTasksMap[milestoneId] || []
      const currentTasks = tasks[milestoneId] || []
      if (newTasks.length !== currentTasks.length) return true
      const currentTaskIds = new Set(currentTasks.map(t => t.id))
      const newTaskIds = new Set(newTasks.map(t => t.id))
      if (currentTaskIds.size !== newTaskIds.size) return true
      return newTasks.some(newTask => {
        const currentTask = currentTasks.find(t => t.id === newTask.id)
        return !currentTask || JSON.stringify(currentTask) !== JSON.stringify(newTask)
      })
    })

    if (hasChanges || Object.keys(tasks).length === 0) {
      setTasks(newTasksMap)
    }
  }, [milestones])

  // Fetch files for expanded milestones
  useEffect(() => {
    const fetchMilestoneFiles = async (milestoneId: string) => {
      try {
        const filesResponse = await fetch(`/api/files?milestoneId=${milestoneId}`)
        if (filesResponse.ok) {
          const filesData = await filesResponse.json()
          setMilestoneFiles(prev => ({ ...prev, [milestoneId]: filesData.files || [] }))
        }
      } catch (error) {
        console.error('Error fetching milestone files:', error)
      }
    }

    expandedMilestones.forEach(milestoneId => {
      if (!milestoneFiles[milestoneId]) {
        fetchMilestoneFiles(milestoneId)
      }
    })
  }, [expandedMilestones])

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId)
    } else {
      newExpanded.add(milestoneId)
    }
    setExpandedMilestones(newExpanded)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...formData,
          dueDate: formData.dueDate || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create milestone')
      }

      setIsDialogOpen(false)
      setFormData({ name: '', description: '', category: '', isImportant: false, dueDate: '' })
      onUpdate()
    } catch (error) {
      console.error('Error creating milestone:', error)
      alert('Failed to create milestone')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (milestone: Milestone & { category?: string | null; isImportant?: boolean }) => {
    setEditingMilestone(milestone.id)
    setEditFormData({
      [milestone.id]: {
        name: milestone.name,
        description: milestone.description || '',
        category: (milestone as any).category || '',
        isImportant: (milestone as any).isImportant || false,
        dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : '',
      },
    })
  }

  const handleUpdate = async (milestoneId: string, e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = editFormData[milestoneId]
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category || null,
          isImportant: formData.isImportant,
          dueDate: formData.dueDate || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update milestone')
      }

      setEditingMilestone(null)
      setEditFormData({})
      onUpdate()
    } catch (error) {
      console.error('Error updating milestone:', error)
      alert('Failed to update milestone')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryInputChange = (value: string, isEdit: boolean = false, milestoneId?: string) => {
    const input = value.toLowerCase().trim()
    if (input.length > 0) {
      const existing = getExistingCategories()
      const filtered = existing.filter(cat => cat.toLowerCase().includes(input))
      setCategorySuggestions(filtered)
      if (isEdit && milestoneId) {
        setShowCategorySuggestions(prev => ({ ...prev, [milestoneId]: true }))
      } else {
        setShowCategorySuggestions(prev => ({ ...prev, 'create': true }))
      }
    } else {
      setCategorySuggestions([])
      if (isEdit && milestoneId) {
        setShowCategorySuggestions(prev => ({ ...prev, [milestoneId]: false }))
      } else {
        setShowCategorySuggestions(prev => ({ ...prev, 'create': false }))
      }
    }
  }

  const handleStatusChange = async (milestoneId: string, newStatus: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger confetti if marking as completed
    if (newStatus === 'COMPLETED' && event?.currentTarget) {
      createConfetti(event.currentTarget)
    }

    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update milestone')
      }

      onUpdate()
    } catch (error) {
      console.error('Error updating milestone:', error)
      alert('Failed to update milestone')
    }
  }

  const handleDelete = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) {
      return
    }

    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete milestone')
      }

      onUpdate()
    } catch (error) {
      console.error('Error deleting milestone:', error)
      alert('Failed to delete milestone')
    }
  }

  const handleFileUpload = async (milestoneId: string, file: File) => {
    setUploadingFiles(prev => ({ ...prev, [milestoneId]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('milestoneId', milestoneId)

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      // Refresh files for this milestone
      const filesResponse = await fetch(`/api/files?milestoneId=${milestoneId}`)
      if (filesResponse.ok) {
        const filesData = await filesResponse.json()
        setMilestoneFiles(prev => ({ ...prev, [milestoneId]: filesData.files || [] }))
      }
      onUpdate()
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    } finally {
      setUploadingFiles(prev => ({ ...prev, [milestoneId]: false }))
    }
  }

  const handleAddComment = async (milestoneId: string, content?: string) => {
    const commentContent = content || commentTexts[milestoneId]?.trim()
    if (!commentContent) return

    try {
      const response = await fetch(`/api/milestones/${milestoneId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      if (!content) {
        setCommentTexts(prev => ({ ...prev, [milestoneId]: '' }))
      }
      // Refresh comments for this milestone
      const commentsResponse = await fetch(`/api/milestones/${milestoneId}/comments`)
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json()
        setMilestoneComments(prev => ({ ...prev, [milestoneId]: commentsData.comments || [] }))
      }
      // Refresh communications for this milestone
      const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestoneId}`)
      if (commsResponse.ok) {
        const commsData = await commsResponse.json()
        setMilestoneCommunications(prev => ({ ...prev, [milestoneId]: (commsData.communications || []).map((comm: any) => ({
          id: comm.id,
          type: comm.type,
          subject: comm.subject,
          content: comm.content,
          direction: comm.direction,
          createdAt: comm.createdAt,
          user: comm.user,
        })) }))
      }
      onUpdate()
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleCreateTask = async (milestoneId: string) => {
    const formData = taskFormData[milestoneId]
    if (!formData || !formData.name.trim()) return

    setLoading(true)
    try {
      // Create task without assignment initially
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId,
          name: formData.name,
          description: formData.description || null,
          dueDate: formData.dueDate || null,
          assignedToId: null, // Don't assign on creation
          isImportant: formData.isImportant || false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const data = await response.json()
      localTaskUpdates.current.add(milestoneId)
      setTasks(prev => ({
        ...prev,
        [milestoneId]: [...(prev[milestoneId] || []), data.task],
      }))
      setTaskFormData(prev => ({ ...prev, [milestoneId]: { name: '', description: '', dueDate: '', assignedToId: '', isImportant: false } }))
      setIsTaskDialogOpen(prev => ({ ...prev, [milestoneId]: false }))
      // Don't call onUpdate immediately - let the user see the update first
      setTimeout(() => onUpdate(), 100)
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTask = async (taskId: string, milestoneId: string, assignedToId: string | null) => {
    try {
      await handleUpdateTask(taskId, milestoneId, { assignedToId })
    } catch (error) {
      console.error('Error assigning task:', error)
      alert('Failed to assign task')
    }
  }

  const handleTaskFileUpload = async (taskId: string, milestoneId: string, file: File) => {
    setUploadingTaskFiles(prev => ({ ...prev, [taskId]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/tasks/${taskId}/files`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      const data = await response.json()
      setTaskFiles(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), data.file],
      }))
      onUpdate()
    } catch (error) {
      console.error('Error uploading task file:', error)
      alert('Failed to upload file')
    } finally {
      setUploadingTaskFiles(prev => ({ ...prev, [taskId]: false }))
    }
  }

  const handleDeleteTaskFile = async (taskId: string, fileId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/files/${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      setTaskFiles(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter(f => f.id !== fileId),
      }))
      onUpdate()
    } catch (error) {
      console.error('Error deleting task file:', error)
      alert('Failed to delete file')
    }
  }

  // Fetch task files when task is expanded
  useEffect(() => {
    const fetchTaskFiles = async (taskId: string) => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/files`)
        if (response.ok) {
          const data = await response.json()
          setTaskFiles(prev => ({ ...prev, [taskId]: data.files || [] }))
        }
      } catch (error) {
        console.error('Error fetching task files:', error)
      }
    }

    expandedTasks.forEach(taskId => {
      if (!taskFiles[taskId]) {
        fetchTaskFiles(taskId)
      }
    })
  }, [expandedTasks])

  const handleUpdateTask = async (taskId: string, milestoneId: string, updates: any, event?: React.ChangeEvent<HTMLSelectElement>) => {
    // Trigger confetti if marking as completed
    if (updates.status === 'COMPLETED' && event?.currentTarget) {
      createConfetti(event.currentTarget)
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const data = await response.json()
      localTaskUpdates.current.add(milestoneId)
      setTasks(prev => ({
        ...prev,
        [milestoneId]: (prev[milestoneId] || []).map(t => t.id === taskId ? data.task : t),
      }))
      // Don't call onUpdate immediately - let the user see the update first
      setTimeout(() => onUpdate(), 100)
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task')
    }
  }

  const handleDeleteTask = async (taskId: string, milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      localTaskUpdates.current.add(milestoneId)
      setTasks(prev => ({
        ...prev,
        [milestoneId]: (prev[milestoneId] || []).filter(t => t.id !== taskId),
      }))
      // Don't call onUpdate immediately - let the user see the update first
      setTimeout(() => onUpdate(), 100)
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    }
  }

  const handleAddTaskComment = async (taskId: string, milestoneId: string, content?: string) => {
    const commentContent = content || taskCommentTexts[taskId]?.trim()
    if (!commentContent) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      const data = await response.json()
      localTaskUpdates.current.add(milestoneId)
      setTasks(prev => ({
        ...prev,
        [milestoneId]: (prev[milestoneId] || []).map(t =>
          t.id === taskId
            ? { ...t, comments: [data.comment, ...t.comments] }
            : t
        ),
      }))
      setTaskCommentTexts(prev => ({ ...prev, [taskId]: '' }))
      // Don't call onUpdate immediately - let the user see the update first
      setTimeout(() => onUpdate(), 100)
    } catch (error) {
      console.error('Error adding task comment:', error)
      alert('Failed to add comment')
    }
  }

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Group milestones by category
  const groupedMilestones = milestones.reduce((acc, milestone) => {
    const category = (milestone as any).category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(milestone)
    return acc
  }, {} as Record<string, typeof milestones>)

  // Sort categories (Uncategorized last)
  const sortedCategories = Object.keys(groupedMilestones).sort((a, b) => {
    if (a === 'Uncategorized') return 1
    if (b === 'Uncategorized') return -1
    return a.localeCompare(b)
  })

  // Sort milestones within each category by creation date
  sortedCategories.forEach(category => {
    groupedMilestones[category].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  })

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Milestones</h2>
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Trigger asChild>
            <button className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              <Plus className="h-4 w-4 mr-1" />
              Add Milestone
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                New Milestone
              </Dialog.Title>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => {
                        setFormData({ ...formData, category: e.target.value })
                        handleCategoryInputChange(e.target.value, false)
                      }}
                      onFocus={() => {
                        if (formData.category) {
                          handleCategoryInputChange(formData.category, false)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowCategorySuggestions(prev => ({ ...prev, 'create': false })), 200)
                      }}
                      placeholder="Optional category/group"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                    {showCategorySuggestions['create'] && categorySuggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-auto">
                        {categorySuggestions.map((cat, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, category: cat })
                              setCategorySuggestions([])
                              setShowCategorySuggestions(prev => ({ ...prev, 'create': false }))
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="milestone-important"
                    checked={formData.isImportant}
                    onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="milestone-important" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Mark as Important
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {milestones.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No milestones yet. Add your first milestone to get started.</p>
      ) : (
        <div className="space-y-4">
          {sortedCategories.map((category) => {
            const categoryMilestones = groupedMilestones[category]
            const isCategoryExpanded = expandedCategories.has(category)
            return (
              <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCategoryExpanded ? <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {category}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({categoryMilestones.length})
                    </span>
                  </div>
                </button>
                {isCategoryExpanded && (
                  <div className="space-y-3 p-3">
                    {categoryMilestones.map((milestone) => {
            const StatusIcon = statusIcons[milestone.status as keyof typeof statusIcons] || Clock
            const isExpanded = expandedMilestones.has(milestone.id)
            return (
              <div
                key={milestone.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 relative">
                  {/* Floating Progress Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
                    {(() => {
                      const milestoneTasks = tasks[milestone.id] || []
                      if (milestoneTasks.length > 0) {
                        // Show colored segments based on task statuses
                        const breakdown = getTaskStatusBreakdown(milestone.id)
                        const total = breakdown.total
                        return (
                          <div className="h-full flex transition-all duration-300">
                            {breakdown.completed > 0 && (
                              <div 
                                className="h-full bg-green-500"
                                style={{ width: `${(breakdown.completed / total) * 100}%` }}
                              />
                            )}
                            {breakdown.inProgress > 0 && (
                              <div 
                                className="h-full bg-blue-500"
                                style={{ width: `${(breakdown.inProgress / total) * 100}%` }}
                              />
                            )}
                            {breakdown.pending > 0 && (
                              <div 
                                className="h-full bg-yellow-500"
                                style={{ width: `${(breakdown.pending / total) * 100}%` }}
                              />
                            )}
                          </div>
                        )
                      } else {
                        // Show single color based on milestone status
                        const progress = calculateMilestoneProgress(milestone)
                        const statusColor = milestone.status === 'COMPLETED' 
                          ? 'bg-green-600' // Different green for milestone completion (darker than task green)
                          : 'bg-blue-600'
                        return (
                          <div 
                            className={`h-full ${statusColor} transition-all duration-300`}
                            style={{ width: `${progress}%` }}
                          />
                        )
                      }
                    })()}
                  </div>
                  <div className="flex items-center gap-3 flex-1 mt-1">
                    <StatusIcon className={`h-5 w-5 ${
                      milestone.status === 'COMPLETED' ? 'text-green-600' : 
                      milestone.status === 'PENDING' ? 'text-red-600' :
                      milestone.status === 'PENDING_WAITING_FOR_INFO' ? 'text-yellow-600' :
                      milestone.status === 'PENDING_SCHEDULED' ? 'text-purple-600' :
                      milestone.status === 'IN_PROGRESS' ? 'text-blue-600' :
                      milestone.status === 'ON_HOLD' ? 'text-orange-600' :
                      'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            const newImportant = !(milestone as any).isImportant
                            fetch(`/api/milestones/${milestone.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ isImportant: newImportant }),
                            }).then(() => onUpdate())
                          }}
                          className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title={(milestone as any).isImportant ? "Mark as not important" : "Mark as important"}
                        >
                          <Star className={`h-4 w-4 ${(milestone as any).isImportant ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                        </button>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{milestone.name}</h3>
                        {(milestone as any).category && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            {(milestone as any).category}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(() => {
                            const milestoneTasks = tasks[milestone.id] || []
                            if (milestoneTasks.length > 0) {
                              return `${calculateMilestoneProgress(milestone)}% (${milestoneTasks.filter(t => t.status === 'COMPLETED').length}/${milestoneTasks.length})`
                            } else {
                              return `${calculateMilestoneProgress(milestone)}% (Status)`
                            }
                          })()}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[milestone.status as keyof typeof statusColors] || statusColors.PENDING}`}>
                          {statusLabels[milestone.status as keyof typeof statusLabels] || milestone.status}
                        </span>
                        <label className="inline-flex items-center px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                          <Paperclip className="h-3 w-3" />
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(milestone.id, file)
                              e.target.value = ''
                            }}
                            disabled={uploadingFiles[milestone.id]}
                            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif"
                          />
                        </label>
                        <button
                          onClick={() => {
                            const note = prompt('Quick note:')
                            if (note && note.trim()) {
                              handleAddComment(milestone.id, note.trim())
                            }
                          }}
                          className="inline-flex items-center px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                          title="Quick note"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </button>
                        {milestoneFiles[milestone.id] && milestoneFiles[milestone.id].length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Paperclip className="h-3 w-3" />
                            {milestoneFiles[milestone.id].length}
                          </span>
                        )}
                        {((milestoneComments[milestone.id]?.length || 0) + (milestoneCommunications[milestone.id]?.length || 0)) > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <MessageSquare className="h-3 w-3" />
                            {(milestoneComments[milestone.id]?.length || 0) + (milestoneCommunications[milestone.id]?.length || 0)}
                          </span>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{milestone.description}</p>
                      )}
                      {milestone.dueDate && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </p>
                      )}
                      {milestone.completedDate && (
                        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                          Completed: {new Date(milestone.completedDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      {Object.entries(statusLabels).map(([status, label]) => {
                        const isActive = milestone.status === status
                        const StatusIcon = statusIcons[status as keyof typeof statusIcons] || Clock
                        return (
                          <button
                            key={status}
                            onClick={(e) => handleStatusChange(milestone.id, status, e)}
                            className={`
                              inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors
                              ${isActive 
                                ? `${statusColors[status as keyof typeof statusColors]} ring-2 ring-offset-1 ring-blue-500` 
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                              }
                            `}
                            title={label}
                          >
                            <StatusIcon className="h-3 w-3" />
                            <span className="hidden sm:inline">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {uploadingFiles[milestone.id] && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Uploading...</span>
                    )}
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(milestone)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit milestone"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(milestone.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete milestone"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Edit Dialog */}
                {editingMilestone === milestone.id && (
                  <Dialog.Root open={editingMilestone === milestone.id} onOpenChange={(open) => {
                    if (!open) {
                      setEditingMilestone(null)
                      setEditFormData({})
                    }
                  }}>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                      <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Edit Milestone
                        </Dialog.Title>
                        <form onSubmit={(e) => handleUpdate(milestone.id, e)} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={editFormData[milestone.id]?.name || ''}
                              onChange={(e) => setEditFormData(prev => ({
                                ...prev,
                                [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', category: '', isImportant: false, dueDate: '' }), name: e.target.value }
                              }))}
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Description
                            </label>
                            <textarea
                              value={editFormData[milestone.id]?.description || ''}
                              onChange={(e) => setEditFormData(prev => ({
                                ...prev,
                                [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', category: '', isImportant: false, dueDate: '' }), description: e.target.value }
                              }))}
                              rows={3}
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Category
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={editFormData[milestone.id]?.category || ''}
                                onChange={(e) => {
                                  setEditFormData(prev => ({
                                    ...prev,
                                    [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', category: '', isImportant: false, dueDate: '' }), category: e.target.value }
                                  }))
                                  handleCategoryInputChange(e.target.value, true, milestone.id)
                                }}
                                onFocus={() => {
                                  const category = editFormData[milestone.id]?.category || ''
                                  if (category) {
                                    handleCategoryInputChange(category, true, milestone.id)
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => setShowCategorySuggestions(prev => ({ ...prev, [milestone.id]: false })), 200)
                                }}
                                placeholder="Optional category/group"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                              />
                              {showCategorySuggestions[milestone.id] && categorySuggestions.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-auto">
                                  {categorySuggestions.map((cat, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setEditFormData(prev => ({
                                          ...prev,
                                          [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', category: '', isImportant: false, dueDate: '' }), category: cat }
                                        }))
                                        setCategorySuggestions([])
                                        setShowCategorySuggestions(prev => ({ ...prev, [milestone.id]: false }))
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`edit-milestone-important-${milestone.id}`}
                              checked={editFormData[milestone.id]?.isImportant || false}
                              onChange={(e) => setEditFormData(prev => ({
                                ...prev,
                                [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', category: '', isImportant: false, dueDate: '' }), isImportant: e.target.checked }
                              }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`edit-milestone-important-${milestone.id}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                              Mark as Important
                            </label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={editFormData[milestone.id]?.dueDate || ''}
                              onChange={(e) => setEditFormData(prev => ({
                                ...prev,
                                [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', category: '', isImportant: false, dueDate: '' }), dueDate: e.target.value }
                              }))}
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMilestone(null)
                                setEditFormData({})
                              }}
                              className="rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                              {loading ? 'Updating...' : 'Update'}
                            </button>
                          </div>
                        </form>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                )}

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                    {/* File Attachments */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          Attachments ({milestoneFiles[milestone.id]?.length || 0})
                        </h4>
                        <label className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
                          <Upload className="h-3 w-3 mr-1" />
                          Upload File
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(milestone.id, file)
                              e.target.value = ''
                            }}
                            disabled={uploadingFiles[milestone.id]}
                            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif"
                          />
                        </label>
                      </div>
                      {uploadingFiles[milestone.id] && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Uploading...</p>
                      )}
                      {milestoneFiles[milestone.id] && milestoneFiles[milestone.id].length > 0 ? (
                        <div className="space-y-1">
                          {milestoneFiles[milestone.id].map((file) => {
                            const isImage = file.fileType?.startsWith('image/')
                            const hasThumbnail = !!file.thumbnailUrl
                            const isSharePoint = !!(file.sharepointId || file.sharepointUrl)
                            
                            return (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isImage && hasThumbnail && file.thumbnailUrl ? (
                                  <div className="relative h-8 w-8 flex-shrink-0 rounded border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-700">
                                    <Image
                                      src={file.thumbnailUrl}
                                      alt={file.name}
                                      fill
                                      className="object-cover"
                                      sizes="32px"
                                    />
                                  </div>
                                ) : isImage ? (
                                  <div className="h-8 w-8 flex-shrink-0 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-gray-400" />
                                  </div>
                                ) : (
                                  <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                    {isSharePoint ? (
                                      <span title="Stored in SharePoint">
                                        <Cloud className="h-3 w-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                      </span>
                                    ) : (
                                      <span title="Stored locally">
                                        <Folder className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.fileSize)}</p>
                                </div>
                              </div>
                              <a
                                href={file.fileUrl}
                                download
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No files attached</p>
                      )}
                    </div>

                    {/* Comments/Notes */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4" />
                        Notes & Comments ({(milestoneComments[milestone.id]?.length || 0) + (milestoneCommunications[milestone.id]?.length || 0)})
                      </h4>
                      <div className="space-y-2 mb-3">
                        {/* Show Communications first (calls, emails, notes from quick actions) */}
                        {milestoneCommunications[milestone.id]?.map((comm) => (
                          <div
                            key={`comm-${comm.id}`}
                            className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                                comm.type === 'CALL' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                comm.type === 'EMAIL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {comm.type}
                              </span>
                              {comm.direction && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {comm.direction}
                                </span>
                              )}
                            </div>
                            {comm.subject && (
                              <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">{comm.subject}</p>
                            )}
                            <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">{comm.content}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {comm.user.name || comm.user.email} • {new Date(comm.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                        {/* Show MilestoneComments (notes added via Add button) */}
                        {milestoneComments[milestone.id]?.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                          >
                            <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">{comment.content}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {comment.user.name || comment.user.email} • {new Date(comment.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          value={commentTexts[milestone.id] || ''}
                          onChange={(e) => setCommentTexts(prev => ({ ...prev, [milestone.id]: e.target.value }))}
                          placeholder="Add a note or comment..."
                          rows={2}
                          className="flex-1 text-xs rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                        />
                        <button
                          onClick={() => handleAddComment(milestone.id)}
                          disabled={!commentTexts[milestone.id]?.trim()}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Record:</p>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => {
                              const direction = prompt('Direction: Inbound or Outbound?')?.toUpperCase()
                              const content = prompt('Call details:')
                              if (content) {
                                fetch('/api/communications', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    type: 'CALL',
                                    content,
                                    direction: direction === 'INBOUND' || direction === 'OUTBOUND' ? direction : null,
                                    projectId,
                                    milestoneId: milestone.id,
                                  }),
                                }).then(async (response) => {
                                  if (response.ok) {
                                    // Refresh communications for this milestone
                                    const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestone.id}`)
                                    if (commsResponse.ok) {
                                      const commsData = await commsResponse.json()
                                      setMilestoneCommunications(prev => ({ ...prev, [milestone.id]: (commsData.communications || []).map((comm: any) => ({
                                        id: comm.id,
                                        type: comm.type,
                                        subject: comm.subject,
                                        content: comm.content,
                                        direction: comm.direction,
                                        createdAt: comm.createdAt,
                                        user: comm.user,
                                      })) }))
                                    }
                                    alert('Call recorded!')
                                    onUpdate()
                                  } else {
                                    alert('Failed to record call')
                                  }
                                }).catch(() => alert('Failed to record call'))
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            title="Record call"
                          >
                            <Phone className="h-3 w-3" />
                            Call
                          </button>
                          <button
                            onClick={() => {
                              const direction = prompt('Direction: Inbound or Outbound?')?.toUpperCase()
                              const subject = prompt('Email subject:')
                              const content = prompt('Email details:')
                              if (content) {
                                fetch('/api/communications', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    type: 'EMAIL',
                                    subject: subject || null,
                                    content,
                                    direction: direction === 'INBOUND' || direction === 'OUTBOUND' ? direction : null,
                                    projectId,
                                    milestoneId: milestone.id,
                                  }),
                                }).then(async (response) => {
                                  if (response.ok) {
                                    // Refresh communications for this milestone
                                    const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestone.id}`)
                                    if (commsResponse.ok) {
                                      const commsData = await commsResponse.json()
                                      setMilestoneCommunications(prev => ({ ...prev, [milestone.id]: (commsData.communications || []).map((comm: any) => ({
                                        id: comm.id,
                                        type: comm.type,
                                        subject: comm.subject,
                                        content: comm.content,
                                        direction: comm.direction,
                                        createdAt: comm.createdAt,
                                        user: comm.user,
                                      })) }))
                                    }
                                    alert('Email recorded!')
                                    onUpdate()
                                  } else {
                                    alert('Failed to record email')
                                  }
                                }).catch(() => alert('Failed to record email'))
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                            title="Record email"
                          >
                            <Mail className="h-3 w-3" />
                            Email
                          </button>
                          <button
                            onClick={() => {
                              const content = prompt('Note:')
                              if (content) {
                                fetch('/api/communications', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    type: 'NOTE',
                                    content,
                                    projectId,
                                    milestoneId: milestone.id,
                                  }),
                                }).then(async (response) => {
                                  if (response.ok) {
                                    // Refresh communications for this milestone
                                    const commsResponse = await fetch(`/api/communications?projectId=${projectId}&milestoneId=${milestone.id}`)
                                    if (commsResponse.ok) {
                                      const commsData = await commsResponse.json()
                                      setMilestoneCommunications(prev => ({ ...prev, [milestone.id]: (commsData.communications || []).map((comm: any) => ({
                                        id: comm.id,
                                        type: comm.type,
                                        subject: comm.subject,
                                        content: comm.content,
                                        direction: comm.direction,
                                        createdAt: comm.createdAt,
                                        user: comm.user,
                                      })) }))
                                    }
                                    alert('Note recorded!')
                                    onUpdate()
                                  } else {
                                    alert('Failed to record note')
                                  }
                                }).catch(() => alert('Failed to record note'))
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                            title="Record note"
                          >
                            <FileText className="h-3 w-3" />
                            Note
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tasks Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          Tasks ({(tasks[milestone.id] || []).length})
                        </h4>
                        <Dialog.Root open={isTaskDialogOpen[milestone.id] || false} onOpenChange={(open) => setIsTaskDialogOpen(prev => ({ ...prev, [milestone.id]: open }))}>
                          <Dialog.Trigger asChild>
                            <button className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                              <Plus className="h-3 w-3 mr-1" />
                              Add Task
                            </button>
                          </Dialog.Trigger>
                          <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
                              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                New Task
                              </Dialog.Title>
                              <form onSubmit={(e) => { e.preventDefault(); handleCreateTask(milestone.id) }} className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Name *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={taskFormData[milestone.id]?.name || ''}
                                    onChange={(e) => setTaskFormData(prev => ({
                                      ...prev,
                                      [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', dueDate: '', assignedToId: '', isImportant: false }), name: e.target.value }
                                    }))}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Description
                                  </label>
                                  <textarea
                                    value={taskFormData[milestone.id]?.description || ''}
                                    onChange={(e) => setTaskFormData(prev => ({
                                      ...prev,
                                      [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', dueDate: '', assignedToId: '', isImportant: false }), description: e.target.value }
                                    }))}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Due Date
                                  </label>
                                  <input
                                    type="date"
                                    value={taskFormData[milestone.id]?.dueDate || ''}
                                    onChange={(e) => setTaskFormData(prev => ({
                                      ...prev,
                                      [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', dueDate: '', assignedToId: '', isImportant: false }), dueDate: e.target.value }
                                    }))}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                                  />
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`task-important-${milestone.id}`}
                                    checked={taskFormData[milestone.id]?.isImportant || false}
                                    onChange={(e) => setTaskFormData(prev => ({
                                      ...prev,
                                      [milestone.id]: { ...(prev[milestone.id] || { name: '', description: '', dueDate: '', assignedToId: '', isImportant: false }), isImportant: e.target.checked }
                                    }))}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <label htmlFor={`task-important-${milestone.id}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                    Mark as Important
                                  </label>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Dialog.Close asChild>
                                    <button
                                      type="button"
                                      className="rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
                                    >
                                      Cancel
                                    </button>
                                  </Dialog.Close>
                                  <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                                  >
                                    {loading ? 'Creating...' : 'Create'}
                                  </button>
                                </div>
                              </form>
                            </Dialog.Content>
                          </Dialog.Portal>
                        </Dialog.Root>
                      </div>
                      <div className="space-y-2">
                        {(tasks[milestone.id] || []).length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">No tasks yet</p>
                        ) : (
                          (tasks[milestone.id] || []).map((task) => {
                            const TaskStatusIcon = taskStatusIcons[task.status as keyof typeof taskStatusIcons] || Clock
                            const isTaskExpanded = expandedTasks.has(task.id)
                            return (
                              <div
                                key={task.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
                              >
                                <div className="flex items-center justify-between p-2">
                                  <div className="flex items-center gap-2 flex-1">
                                    <TaskStatusIcon className={`h-4 w-4 ${
                                      task.status === 'COMPLETED' ? 'text-green-600' :
                                      task.status === 'IN_PROGRESS' ? 'text-blue-600' :
                                      task.status === 'ON_HOLD' ? 'text-orange-600' :
                                      'text-gray-400'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const newImportant = !(task as any).isImportant
                                            handleUpdateTask(task.id, milestone.id, { isImportant: newImportant })
                                          }}
                                          className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                          title={(task as any).isImportant ? "Mark as not important" : "Mark as important"}
                                        >
                                          <Star className={`h-3 w-3 ${(task as any).isImportant ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                                        </button>
                                        <h5 className="text-xs font-medium text-gray-900 dark:text-white">{task.name}</h5>
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${taskStatusColors[task.status as keyof typeof taskStatusColors] || taskStatusColors.PENDING}`}>
                                          {taskStatusLabels[task.status as keyof typeof taskStatusLabels] || task.status}
                                        </span>
                                        {task.assignedTo ? (
                                          <div className="flex items-center gap-1">
                                            <UserAvatar
                                              userId={task.assignedTo.id}
                                              userName={task.assignedTo.name}
                                              userEmail={task.assignedTo.email}
                                              provider={task.assignedTo.provider}
                                              size={16}
                                            />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              {task.assignedTo.name || task.assignedTo.email}
                                            </span>
                                          </div>
                                        ) : (
                                          <select
                                            value=""
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                handleAssignTask(task.id, milestone.id, e.target.value)
                                              }
                                            }}
                                            className="text-xs rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <option value="">Assign...</option>
                                            {users.map((user) => (
                                              <option key={user.id} value={user.id}>
                                                {user.name || user.email}
                                              </option>
                                            ))}
                                          </select>
                                        )}
                                        {task.comments.length > 0 && (
                                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                            <MessageSquare className="h-3 w-3" />
                                            {task.comments.length}
                                          </span>
                                        )}
                                      </div>
                                      {task.description && (
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
                                      )}
                                      {task.dueDate && (
                                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                          Due: {new Date(task.dueDate).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleUpdateTask(task.id, milestone.id, { status: e.target.value }, e)}
                                      className="text-xs rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                      {Object.entries(taskStatusLabels).map(([status, label]) => (
                                        <option key={status} value={status}>{label}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => toggleTask(task.id)}
                                      className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                      {isTaskExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTask(task.id, milestone.id)}
                                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                {isTaskExpanded && (
                                  <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-2 bg-gray-50 dark:bg-gray-900">
                                    {/* Task Files */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <h6 className="text-xs font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                          <Paperclip className="h-3 w-3" />
                                          Files ({taskFiles[task.id]?.length || 0})
                                        </h6>
                                        <label className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
                                          <Upload className="h-3 w-3 mr-1" />
                                          Upload
                                          <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) handleTaskFileUpload(task.id, milestone.id, file)
                                              e.target.value = ''
                                            }}
                                            disabled={uploadingTaskFiles[task.id]}
                                            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif"
                                          />
                                        </label>
                                      </div>
                                      {uploadingTaskFiles[task.id] && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Uploading...</p>
                                      )}
                                      {taskFiles[task.id] && taskFiles[task.id].length > 0 ? (
                                        <div className="space-y-1 mb-2">
                                          {taskFiles[task.id].map((file) => (
                                            <div
                                              key={file.id}
                                              className="flex items-center justify-between p-1.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                                            >
                                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <File className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.fileSize)}</p>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <a
                                                  href={file.fileUrl}
                                                  download
                                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                  <Download className="h-3 w-3" />
                                                </a>
                                                <button
                                                  onClick={() => handleDeleteTaskFile(task.id, file.id)}
                                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">No files attached</p>
                                      )}
                                    </div>
                                    <div>
                                      <h6 className="text-xs font-medium text-gray-900 dark:text-white mb-1">Comments</h6>
                                      <div className="space-y-1 mb-2">
                                        {task.comments.map((comment) => (
                                          <div
                                            key={comment.id}
                                            className="p-1.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                                          >
                                            <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">{comment.content}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                              {comment.user.name || comment.user.email} • {new Date(comment.createdAt).toLocaleString()}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex gap-1">
                                        <textarea
                                          value={taskCommentTexts[task.id] || ''}
                                          onChange={(e) => setTaskCommentTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
                                          placeholder="Add a comment..."
                                          rows={2}
                                          className="flex-1 text-xs rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                                        />
                                        <button
                                          onClick={() => handleAddTaskComment(task.id, milestone.id)}
                                          disabled={!taskCommentTexts[task.id]?.trim()}
                                          className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Add
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
