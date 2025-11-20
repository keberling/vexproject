import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if Microsoft authentication is enabled
    const microsoftEnabled = !!(
      process.env.AZURE_AD_CLIENT_ID &&
      process.env.AZURE_AD_CLIENT_SECRET &&
      process.env.AZURE_AD_TENANT_ID
    )

    return NextResponse.json({ microsoftEnabled })
  } catch (error) {
    console.error('Error checking Microsoft auth:', error)
    return NextResponse.json(
      { microsoftEnabled: false },
      { status: 500 }
    )
  }
}

