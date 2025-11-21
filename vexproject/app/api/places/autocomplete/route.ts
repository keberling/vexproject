import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const input = searchParams.get('input')

    if (!input || input.length < 3) {
      return NextResponse.json(
        { error: 'Input must be at least 3 characters' },
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
    const url = `https://places.googleapis.com/v1/places:autocomplete`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      },
      body: JSON.stringify({
        input: input,
        includedRegionCodes: ['us'],
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Places API (New) error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch suggestions', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Transform new API response format to match old format for compatibility
    const transformedData = {
      status: 'OK',
      predictions: (data.suggestions || []).map((suggestion: any) => {
        const prediction = suggestion.placePrediction
        return {
          description: prediction.text.text,
          place_id: prediction.placeId,
          structured_formatting: {
            main_text: prediction.text.text.split(',')[0],
            secondary_text: prediction.text.text.split(',').slice(1).join(',').trim(),
          },
        }
      }),
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error proxying Google Places API (New):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

