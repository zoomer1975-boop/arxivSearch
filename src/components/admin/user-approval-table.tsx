'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type User = {
  id: string
  name: string
  email: string
  institution: string | null
  status: string
  role: string
  createdAt: string
}

export function UserApprovalTable({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(userId: string, status: 'APPROVED' | 'REJECTED') {
    setLoading(userId)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status }),
    })

    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u))
    }
    setLoading(null)
  }

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left font-medium">Name</th>
            <th className="py-2 text-left font-medium">Email</th>
            <th className="py-2 text-left font-medium">Institution</th>
            <th className="py-2 text-left font-medium">Status</th>
            <th className="py-2 text-left font-medium">Joined</th>
            <th className="py-2 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="py-2">{user.name}</td>
              <td className="py-2">{user.email}</td>
              <td className="py-2">{user.institution ?? '-'}</td>
              <td className="py-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[user.status] ?? ''}`}>
                  {user.status}
                </span>
              </td>
              <td className="py-2">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="py-2 space-x-2">
                {user.status === 'PENDING' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateStatus(user.id, 'APPROVED')}
                      disabled={loading === user.id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus(user.id, 'REJECTED')}
                      disabled={loading === user.id}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {user.status !== 'PENDING' && (
                  <span className="text-gray-400 text-xs">No actions</span>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">No users found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
