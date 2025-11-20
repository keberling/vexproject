'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderKanban, Calendar, LogOut, FileText, Shield } from 'lucide-react'
import UserAvatar from './user-avatar'

interface SidebarProps {
  user: {
    id: string
    email: string
    name: string | null
    role?: string
    provider?: string | null
  }
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'Templates', href: '/dashboard/templates', icon: FileText },
    { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
    ...(user.role === 'admin' ? [{ name: 'Admin', href: '/dashboard/admin', icon: Shield }] : []),
  ]

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">VEX Projects</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                          ${isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }
                        `}
                      >
                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
            <li className="mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <UserAvatar
                  userId={user.id}
                  userName={user.name}
                  userEmail={user.email}
                  provider={user.provider}
                  size={32}
                />
                <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500 truncate">
                  {user.name || user.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 w-full"
              >
                <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}

