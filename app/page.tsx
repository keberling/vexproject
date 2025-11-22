import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import LoginPage from '@/components/login-page'

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic'

export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div suppressHydrationWarning>
        <LoginPage />
      </div>
    )
  }

  redirect('/dashboard')
}

