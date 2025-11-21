import { Check, Clock, AlertCircle, Calendar, Pause } from 'lucide-react'
import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Vexitey Portal Guide
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Understanding status colors, progress bars, and how milestones are tracked
        </p>
      </div>

      <div className="space-y-8">
        {/* Milestone Statuses */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Milestone Statuses
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Milestones can have one of the following statuses, each with a distinct color:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                <Clock className="h-4 w-4 mr-1" />
                Pending
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Milestone has not been started yet
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                <AlertCircle className="h-4 w-4 mr-1" />
                Waiting for Info
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Milestone is waiting for information or input
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                <Calendar className="h-4 w-4 mr-1" />
                Scheduled
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Milestone has been scheduled for a future date
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                <Clock className="h-4 w-4 mr-1" />
                In Progress
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Milestone is currently being worked on
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                <Check className="h-4 w-4 mr-1" />
                Completed
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Milestone has been finished
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                <Pause className="h-4 w-4 mr-1" />
                On Hold
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Milestone is temporarily paused
              </p>
            </div>
          </div>
        </section>

        {/* Task Statuses */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Task Statuses
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Tasks within milestones can have the following statuses:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                <Clock className="h-4 w-4 mr-1" />
                Pending
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Task has not been started
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                <Clock className="h-4 w-4 mr-1" />
                In Progress
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Task is currently being worked on
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                <Check className="h-4 w-4 mr-1" />
                Completed
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Task has been finished
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                <Pause className="h-4 w-4 mr-1" />
                On Hold
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Task is temporarily paused
              </p>
            </div>
          </div>
        </section>

        {/* Progress Bar Colors */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Progress Bar Colors
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Progress bars show different colors depending on whether milestones have tasks or are tracked by status:
          </p>

          <div className="space-y-6">
            {/* Milestones with Tasks */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Milestones with Tasks
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                When a milestone has tasks, the progress bar shows colored segments representing task statuses:
              </p>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Example: 3 Completed, 2 In Progress, 1 Pending
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                    <div className="h-full flex">
                      <div className="h-full bg-green-500" style={{ width: '50%' }} />
                      <div className="h-full bg-blue-500" style={{ width: '33.33%' }} />
                      <div className="h-full bg-yellow-500" style={{ width: '16.67%' }} />
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Green = Completed Tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Blue = In Progress Tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span>Yellow = Pending/On Hold Tasks</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Example: All Tasks Completed
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                    <div className="h-full bg-green-500" style={{ width: '100%' }} />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    When all tasks are completed, the entire bar is green
                  </p>
                </div>
              </div>
            </div>

            {/* Milestones without Tasks */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Milestones without Tasks
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                When a milestone has no tasks, progress is calculated based on the milestone status:
              </p>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Completed Milestone (100%)
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                    <div className="h-full bg-green-600" style={{ width: '100%' }} />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Darker green (bg-green-600)</span> indicates a completed milestone tracked by status
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    In Progress Milestone (50%)
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                    <div className="h-full bg-blue-600" style={{ width: '50%' }} />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Blue bar shows progress based on milestone status
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Status Progress Mapping
                  </p>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Waiting for Info:</span>
                      <span className="font-medium">10%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scheduled:</span>
                      <span className="font-medium">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>On Hold:</span>
                      <span className="font-medium">30%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>In Progress:</span>
                      <span className="font-medium">50%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-medium">100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Color Comparison */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Color Comparison
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Understanding the difference between task completion and milestone completion:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Task Completion Green
              </h3>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                <div className="h-full bg-green-500" style={{ width: '100%' }} />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">bg-green-500</span> - Used when tasks are completed
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Milestone Completion Green
              </h3>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                <div className="h-full bg-green-600" style={{ width: '100%' }} />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">bg-green-600</span> - Used when milestone (without tasks) is completed
              </p>
            </div>
          </div>
        </section>

        {/* How Progress is Calculated */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            How Progress is Calculated
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Milestones with Tasks
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Progress = (Number of Completed Tasks / Total Number of Tasks) × 100%
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                Example: 3 completed tasks out of 5 total = 60% progress
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                Milestones without Tasks
              </h3>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Progress is determined by the milestone status using a predefined mapping:
              </p>
              <ul className="text-xs text-purple-700 dark:text-purple-300 mt-2 list-disc list-inside space-y-1">
                <li>Pending → 0%</li>
                <li>Waiting for Info → 10%</li>
                <li>Scheduled → 20%</li>
                <li>On Hold → 30%</li>
                <li>In Progress → 50%</li>
                <li>Completed → 100%</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Quick Reference */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Reference
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Progress Bar Colors</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Green (light) - Completed tasks</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span>Green (dark) - Completed milestone (no tasks)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Blue - In progress tasks/milestones</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>Yellow - Pending/on hold tasks</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Status Badge Colors</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li><span className="inline-block w-4 h-4 bg-red-100 rounded mr-2"></span>Red - Pending</li>
                <li><span className="inline-block w-4 h-4 bg-yellow-100 rounded mr-2"></span>Yellow - Waiting/Scheduled</li>
                <li><span className="inline-block w-4 h-4 bg-blue-100 rounded mr-2"></span>Blue - In Progress</li>
                <li><span className="inline-block w-4 h-4 bg-green-100 rounded mr-2"></span>Green - Completed</li>
                <li><span className="inline-block w-4 h-4 bg-orange-100 rounded mr-2"></span>Orange - On Hold</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <div className="flex justify-center pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

