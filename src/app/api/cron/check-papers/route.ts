import { NextRequest, NextResponse } from 'next/server'
import { runPaperCheck } from '@/lib/cron'
import { prisma } from '@/lib/prisma'

export const maxDuration = 300 // 5 minutes for Vercel

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await runPaperCheck()

    const status =
      stats.errors.length === 0
        ? 'SUCCESS'
        : stats.alertsSent > 0
        ? 'PARTIAL'
        : 'FAILED'

    await prisma.cronLog.create({
      data: {
        queriesRun: stats.queriesRun,
        papersFound: stats.papersFound,
        alertsSent: stats.alertsSent,
        errors: stats.errors.length > 0 ? JSON.stringify(stats.errors) : null,
        status,
      },
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
