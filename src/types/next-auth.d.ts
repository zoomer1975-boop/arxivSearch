import { Role, Status } from '@/generated/prisma/enums'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      status: Status
    } & DefaultSession['user']
  }

  interface User {
    id: string
    name: string
    email: string
    role: Role
    status: Status
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    status: Status
  }
}
