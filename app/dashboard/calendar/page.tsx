import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import CalendarView from '@/components/calendar-view'

export default async function CalendarPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Calendar</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          View and manage your scheduled events
        </p>
      </div>
      <CalendarView />
    </div>
  )
}

