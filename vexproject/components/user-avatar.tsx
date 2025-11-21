'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { User as UserIcon } from 'lucide-react'

interface UserAvatarProps {
  userId: string
  userName?: string | null
  userEmail?: string
  provider?: string | null
  size?: number
  className?: string
}

export default function UserAvatar({
  userId,
  userName,
  userEmail,
  provider,
  size = 32,
  className = '',
}: UserAvatarProps) {
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only fetch if user has Microsoft SSO
    if (provider === 'microsoft') {
      fetchProfilePicture()
    } else {
      setLoading(false)
    }
  }, [userId, provider])

  const fetchProfilePicture = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/profile-picture`)
      if (response.ok) {
        const data = await response.json()
        if (data.profilePictureUrl) {
          // If it needs proxy, use the image endpoint
          if (data.needsProxy) {
            setProfilePictureUrl(`/api/users/${userId}/profile-picture/image`)
          } else {
            setProfilePictureUrl(data.profilePictureUrl)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get initials for fallback
  const getInitials = () => {
    if (userName) {
      const parts = userName.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return userName.substring(0, 2).toUpperCase()
    }
    if (userEmail) {
      return userEmail.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  if (loading) {
    return (
      <div
        className={`rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (profilePictureUrl) {
    return (
      <Image
        src={profilePictureUrl}
        alt={userName || userEmail || 'User'}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        unoptimized
      />
    )
  }

  // Fallback to initials
  return (
    <div
      className={`rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-xs font-medium ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={userName || userEmail || 'User'}
    >
      {getInitials()}
    </div>
  )
}

