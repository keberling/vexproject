'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import * as Switch from '@radix-ui/react-switch'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Always render the same structure to avoid hydration mismatch
  // Use a default checked state that matches light mode initially
  const isDark = mounted && (theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches))

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      <Switch.Root
        className="relative h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors data-[state=checked]:bg-blue-600"
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        suppressHydrationWarning
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform will-change-transform data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
      <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    </div>
  )
}

