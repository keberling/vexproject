import { NextResponse } from 'next/server'
import { initializeAdmin } from '@/lib/init-admin'

// Initialize admin user from environment variable
// This can be called on server startup or manually
export async function GET() {
  try {
    await initializeAdmin()
    return NextResponse.json({ success: true, message: 'Admin initialization completed' })
  } catch (error) {
    console.error('Error initializing admin:', error)
    return NextResponse.json(
      { error: 'Failed to initialize admin user' },
      { status: 500 }
    )
  }
}

