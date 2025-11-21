import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import LoginPage from '@/components/login-page'

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

