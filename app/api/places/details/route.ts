import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('place_id')

    if (!placeId) {
      return NextResponse.json(
        { error: 'place_id is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Use Places API (New) - different endpoint and format
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'formattedAddress',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Places API (New) error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch place details', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Transform new API response format to match old format for compatibility
    const transformedData = {
      status: 'OK',
      result: {
        formatted_address: data.formattedAddress || '',
      },
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error proxying Google Places Details API (New):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

