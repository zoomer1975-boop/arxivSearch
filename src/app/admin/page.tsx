import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { UserApprovalTable } from '@/components/admin/user-approval-table'

export default async function AdminPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      institution: true,
      status: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const serialized = users.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">User Management</h2>
        <UserApprovalTable initialUsers={serialized} />
      </div>
    </div>
  )
}
