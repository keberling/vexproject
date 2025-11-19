import { sign, verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

export interface JWTPayload {
  userId: string
  email: string
}

export function generateToken(payload: JWTPayload): string {
  return sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  return payload
}

export async function getCurrentUserWithRole() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { id: true, email: true, name: true, role: true },
  })

  return userData
}

export async function isAdmin() {
  const user = await getCurrentUserWithRole()
  return user?.role === 'ADMIN'
}

