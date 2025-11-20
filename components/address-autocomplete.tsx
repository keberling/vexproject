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
  const autocompleteServiceRef = useRef<any>(null)
  const placesServiceRef = useRef<any>(null)

  // Initialize Google Places Autocomplete service
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('Google Maps API key not found. Address autocomplete will use REST API fallback.')
      return
    }

    // Load Google Maps script if not already loaded
    if (!window.google || !window.google.maps) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          try {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
            placesServiceRef.current = new window.google.maps.places.PlacesService(
              document.createElement('div')
            )
            console.log('Google Places Autocomplete service initialized')
          } catch (error) {
            console.error('Error initializing Google Places service:', error)
          }
        } else {
          console.warn('Google Maps Places library not available')
        }
      }
      script.onerror = () => {
        console.error('Failed to load Google Maps script. Check your API key and network connection.')
      }
      document.head.appendChild(script)
    } else {
      try {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
        placesServiceRef.current = new window.google.maps.places.PlacesService(
          document.createElement('div')
        )
        console.log('Google Places Autocomplete service initialized (already loaded)')
      } catch (error) {
        console.error('Error initializing Google Places service:', error)
      }
    }
  }, [])

  // Fetch address suggestions from Google Places Autocomplete API
  const fetchSuggestions = async (query: string) => {
    console.log('fetchSuggestions called with query:', query)
    if (!query || query.length < 3) {
      console.log('Query too short, clearing suggestions')
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Get API key - in Next.js, NEXT_PUBLIC_ vars are available at build time
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    console.log('API Key check:', apiKey ? `Found (${apiKey.substring(0, 10)}...)` : 'NOT FOUND')
    
    if (!apiKey) {
      console.error('Google Maps API key not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file and restart the dev server.')
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    try {
      // Try using Google Places Autocomplete service first
      if (autocompleteServiceRef.current && window.google && window.google.maps && window.google.maps.places) {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: query,
            types: ['address'],
            componentRestrictions: { country: 'us' }, // Restrict to US addresses
          },
          (predictions: AddressSuggestion[] | null, status: string) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              setSuggestions(predictions)
              setShowSuggestions(predictions.length > 0)
            } else {
              console.warn('Google Places API status:', status)
              setSuggestions([])
              setShowSuggestions(false)
            }
            setIsLoading(false)
          }
        )
      } else {
        // Use REST API (more reliable than JS service)
        console.log('Using REST API for address autocomplete')
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&components=country:us&key=${apiKey}`
        console.log('Fetching from:', url.replace(apiKey, 'API_KEY_HIDDEN'))
        const response = await fetch(url)

        if (response.ok) {
          const data = await response.json()
          console.log('Google Places API response:', data.status, data.predictions?.length || 0, 'results')
          if (data.status === 'OK' && data.predictions) {
            setSuggestions(data.predictions)
            setShowSuggestions(data.predictions.length > 0)
          } else if (data.status === 'REQUEST_DENIED') {
            console.error('Google Places API request denied. Check your API key and enable Places API in Google Cloud Console.')
          } else if (data.status === 'OVER_QUERY_LIMIT') {
            console.error('Google Places API quota exceeded.')
          } else {
            console.warn('Google Places API status:', data.status, data.error_message || '')
            setSuggestions([])
            setShowSuggestions(false)
          }
        } else {
          const errorText = await response.text()
          console.error('Google Places API error:', response.status, errorText)
          setSuggestions([])
          setShowSuggestions(false)
        }
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
      setIsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value && value.length >= 3) {
      debounceRef.current = setTimeout(() => {
        console.log('Fetching suggestions for:', value)
        fetchSuggestions(value)
      }, 300) // Wait 300ms after user stops typing
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }

    return () => {
      if (debounceRef.current) {
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
    // Get full address details from place_id
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    let fullAddress = suggestion.description

    if (apiKey && placesServiceRef.current) {
      try {
        const request = {
          placeId: suggestion.place_id,
          fields: ['formatted_address'],
        }
        placesServiceRef.current.getDetails(request, (place: any, status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            fullAddress = place.formatted_address
            onChange(fullAddress)
          } else {
            onChange(suggestion.description)
          }
        })
      } catch (error) {
        console.error('Error getting place details:', error)
        onChange(suggestion.description)
      }
    } else if (apiKey) {
      // Fallback: Use REST API
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&fields=formatted_address&key=${apiKey}`
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
    } else {
      onChange(suggestion.description)
    }

    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    console.log('Input changed:', newValue)
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

