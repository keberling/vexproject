'use client'

import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { useSize } from '@/lib/size-context'
import * as Switch from '@radix-ui/react-switch'

export function SizeToggle() {
  const { sizeMode, setSizeMode } = useSize()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isSmall = mounted && sizeMode === 'small'

  return (
    <div className="flex items-center gap-2">
      <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      <Switch.Root
        className="relative h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors data-[state=checked]:bg-blue-600"
        checked={isSmall}
        onCheckedChange={(checked) => setSizeMode(checked ? 'small' : 'large')}
        suppressHydrationWarning
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform will-change-transform data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
      <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    </div>
  )
}

