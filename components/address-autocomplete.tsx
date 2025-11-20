'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, X } from 'lucide-react'

interface AddressSuggestion {
  description: string
  place_id: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
  name?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address',
  className = '',
  id,
  name,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // No need to load Google Maps script - we use server-side proxy API

  // Fetch address suggestions via server-side proxy (avoids CORS)
  const fetchSuggestions = async (query: string) => {
    console.log('🔍 fetchSuggestions called with query:', query)
    
    if (!query || query.length < 3) {
      console.log('❌ Query too short, clearing suggestions')
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    console.log('⏳ Starting API request via proxy...')
    
    try {
      // Use our server-side proxy API to avoid CORS issues
      const url = `/api/places/autocomplete?input=${encodeURIComponent(query)}`
      console.log('🌐 Fetching from proxy API:', url)
      
      const response = await fetch(url)
      console.log('📡 Response status:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ API Response:', {
          status: data.status,
          resultCount: data.predictions?.length || 0,
          error_message: data.error_message
        })
        
        if (data.status === 'OK' && data.predictions) {
          console.log('✅ Setting suggestions:', data.predictions.length)
          setSuggestions(data.predictions)
          setShowSuggestions(data.predictions.length > 0)
        } else if (data.status === 'REQUEST_DENIED') {
          console.error('❌ REQUEST_DENIED:', data.error_message || 'Check your API key and enable Places API (New) in Google Cloud Console')
          setSuggestions([])
          setShowSuggestions(false)
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          console.error('❌ OVER_QUERY_LIMIT: Quota exceeded')
          setSuggestions([])
          setShowSuggestions(false)
        } else {
          console.warn('⚠️ API status:', data.status, data.error_message || '')
          setSuggestions([])
          setShowSuggestions(false)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ HTTP Error:', response.status, errorData)
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('❌ Exception fetching address suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
      console.log('✅ Request complete')
    }
  }

  // Debounced search
  useEffect(() => {
    console.log('🔄 useEffect triggered, value:', value, 'length:', value?.length || 0)
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value && value.length >= 3) {
      console.log('⏱️ Setting 300ms timeout to fetch suggestions')
      debounceRef.current = setTimeout(() => {
        console.log('⏰ Timeout fired! Calling fetchSuggestions with:', value)
        fetchSuggestions(value)
      }, 300) // Wait 300ms after user stops typing
    } else {
      console.log('🧹 Clearing suggestions (value too short or empty)')
      setSuggestions([])
      setShowSuggestions(false)
    }

    return () => {
      if (debounceRef.current) {
        console.log('🧹 Cleaning up timeout')
        clearTimeout(debounceRef.current)
      }
    }
  }, [value])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    // Get full address details from place_id via server-side proxy
    let fullAddress = suggestion.description

    try {
      const response = await fetch(
        `/api/places/details?place_id=${encodeURIComponent(suggestion.place_id)}`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.result && data.result.formatted_address) {
          fullAddress = data.result.formatted_address
        }
      }
    } catch (error) {
      console.error('Error fetching place details:', error)
    }
    
    onChange(fullAddress)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    console.log('⌨️ Input changed:', newValue, 'Length:', newValue.length)
    onChange(newValue)
    setSelectedIndex(-1)
  }

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow click events on suggestions
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false)
      }
    }, 200)
  }

  const clearAddress = () => {
    onChange('')
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={`${className} pl-10 pr-10`}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={clearAddress}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {isLoading && (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          )}
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {suggestion.structured_formatting ? (
                    <>
                      <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {suggestion.structured_formatting.secondary_text}
                      </div>
                    </>
                  ) : (
                    <span>{suggestion.description}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
              ? 'Powered by Google Places • You can also type manually'
              : 'Type address manually (Google Maps API key not configured)'}
          </div>
        </div>
      )}
    </div>
  )
}

