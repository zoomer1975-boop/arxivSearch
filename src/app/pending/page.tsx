import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PendingPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.status === 'APPROVED') redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <CardTitle>
            {session.user.status === 'REJECTED' ? 'Registration Rejected' : 'Awaiting Approval'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.user.status === 'REJECTED' ? (
            <p className="text-red-600">
              Your registration has been rejected. Please contact the administrator.
            </p>
          ) : (
            <p className="text-gray-600">
              Your account is pending admin approval. You will be notified once approved.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
