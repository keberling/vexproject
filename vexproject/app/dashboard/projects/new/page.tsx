import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import NewProjectForm from '@/components/new-project-form'

export default async function NewProjectPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">New Project</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Create a new project for a low voltage installation
        </p>
      </div>
      <NewProjectForm />
    </div>
  )
}

