'use client'

import * as React from 'react'

type SizeMode = 'small' | 'large'

interface SizeContextType {
  sizeMode: SizeMode
  setSizeMode: (mode: SizeMode) => void
}

const SizeContext = React.createContext<SizeContextType | undefined>(undefined)

export function SizeProvider({ children }: { children: React.ReactNode }) {
  const [sizeMode, setSizeModeState] = React.useState<SizeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('size-mode')
      return (saved as SizeMode) || 'large'
    }
    return 'large'
  })

  const setSizeMode = React.useCallback((mode: SizeMode) => {
    setSizeModeState(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('size-mode', mode)
      document.documentElement.setAttribute('data-size-mode', mode)
    }
  }, [])

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-size-mode', sizeMode)
      // Set initial size mode on mount
      const saved = localStorage.getItem('size-mode')
      const initialMode = (saved as SizeMode) || 'large'
      document.documentElement.setAttribute('data-size-mode', initialMode)
    }
  }, [])
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-size-mode', sizeMode)
    }
  }, [sizeMode])

  return (
    <SizeContext.Provider value={{ sizeMode, setSizeMode }}>
      {children}
    </SizeContext.Provider>
  )
}

export function useSize() {
  const context = React.useContext(SizeContext)
  if (context === undefined) {
    throw new Error('useSize must be used within a SizeProvider')
  }
  return context
}

