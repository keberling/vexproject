'use client'

import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format } from 'date-fns'
import { CalendarEvent } from '@prisma/client'
import { Plus, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

export default function CalendarView() {
  const [date, setDate] = useState(new Date())
  const [events, setEvents] = useState<(CalendarEvent & { project?: { id: string; name: string } | null })[]>([])
  const [selectedEvents, setSelectedEvents] = useState<(CalendarEvent & { project?: { id: string; name: string } | null })[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    allDay: false,
    location: '',
    projectId: '',
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/calendar')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const handleDateChange = (newDate: Date) => {
    setDate(newDate)
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.startDate)
      return (
        eventDate.getDate() === newDate.getDate() &&
        eventDate.getMonth() === newDate.getMonth() &&
        eventDate.getFullYear() === newDate.getFullYear()
      )
    })
    setSelectedEvents(dayEvents)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: formData.projectId || undefined,
          startDate: formData.startDate || new Date().toISOString(),
          endDate: formData.endDate || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      const data = await response.json()
      
      // Optimistically update the events list
      if (data.event) {
        setEvents(prev => [...prev, data.event])
      }

      setIsDialogOpen(false)
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        allDay: false,
        location: '',
        projectId: '',
      })
      
      // Refetch to ensure we have the latest data
      await fetchEvents()
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Failed to create event')
      // Refetch on error to ensure consistency
      fetchEvents()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      fetchEvents()
      setSelectedEvents(selectedEvents.filter((e) => e.id !== eventId))
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    }
  }

  const tileContent = ({ date }: { date: Date }) => {
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.startDate)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })

    if (dayEvents.length === 0) return null

    return (
      <div className="flex gap-1 justify-center mt-1">
        {dayEvents.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className="w-1.5 h-1.5 rounded-full bg-blue-600"
            title={event.title}
          />
        ))}
        {dayEvents.length > 3 && (
          <span className="text-xs text-blue-600">+{dayEvents.length - 3}</span>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Calendar</h2>
            <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <Dialog.Trigger asChild>
                <button className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    New Calendar Event
                  </Dialog.Title>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                        Start Date/Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        End Date/Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allDay"
                        checked={formData.allDay}
                        onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="allDay" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        All day event
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
          <Calendar
            onChange={handleDateChange}
            value={date}
            tileContent={tileContent}
            className="w-full"
          />
        </div>
      </div>
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {format(date, 'MMMM d, yyyy')}
          </h2>
          {selectedEvents.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No events scheduled for this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</h3>
                      {event.description && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {new Date(event.startDate).toLocaleTimeString()}
                        {event.endDate && ` - ${new Date(event.endDate).toLocaleTimeString()}`}
                      </p>
                      {event.location && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">📍 {event.location}</p>
                      )}
                      {event.project && (
                        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Project: {event.project.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

