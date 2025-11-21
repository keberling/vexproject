/**
 * Shared status color configuration for projects and milestones
 * Ensures consistent color representation across the application
 */

export const projectStatusColors: Record<string, string> = {
  INITIAL_CONTACT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  QUOTE_SENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  QUOTE_APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  CONTRACT_SIGNED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  PAYMENT_RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  PARTS_ORDERED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  PARTS_RECEIVED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  INSTALLATION_SCHEDULED: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  INSTALLATION_IN_PROGRESS: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  INSTALLATION_COMPLETE: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  FINAL_INSPECTION: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  PROJECT_COMPLETE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  ON_HOLD: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

export const milestoneStatusColors: Record<string, string> = {
  PENDING: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  PENDING_WAITING_FOR_INFO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  PENDING_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ON_HOLD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
}

// Progress bar segment colors (for visual representation)
export const milestoneProgressColors: Record<string, string> = {
  PENDING: 'bg-red-400',
  PENDING_WAITING_FOR_INFO: 'bg-yellow-400',
  PENDING_SCHEDULED: 'bg-purple-400',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  ON_HOLD: 'bg-orange-500',
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
}

