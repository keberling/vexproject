import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserWithRole()

    if (!user || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role } = await request.json()

    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent admin from removing their own admin role
    if (user.id === params.id && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot remove your own admin role' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserWithRole()

    if (!user || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent admin from deleting themselves
    if (user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
