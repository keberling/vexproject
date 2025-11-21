// Google Maps API TypeScript declarations
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: {
                input: string
                types?: string[]
                componentRestrictions?: { country: string }
              },
              callback: (predictions: any[] | null, status: string) => void
            ) => void
          }
          PlacesService: new (element: HTMLElement) => {
            getDetails: (
              request: { placeId: string; fields: string[] },
              callback: (place: any, status: string) => void
            ) => void
          }
          PlacesServiceStatus: {
            OK: string
            ZERO_RESULTS: string
            OVER_QUERY_LIMIT: string
            REQUEST_DENIED: string
            INVALID_REQUEST: string
          }
        }
      }
    }
  }
}

export {}

