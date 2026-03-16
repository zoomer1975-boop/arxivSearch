import cron from 'node-cron'

let initialized = false

export function initCron(): void {
  if (initialized) return
  if (process.env.NODE_ENV !== 'production') {
    console.log('Cron: skipping initialization in non-production environment')
    return
  }

  initialized = true
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('Cron: CRON_SECRET not set, cron will not run')
    return
  }

  // Run every day at 00:00 UTC (09:00 KST)
  cron.schedule('0 0 * * *', async () => {
    console.log('Cron: triggering paper check...')
    try {
      const res = await fetch(`${siteUrl}/api/cron/check-papers`, {
        method: 'POST',
        headers: { 'x-cron-secret': cronSecret },
      })
      if (!res.ok) {
        console.error('Cron: trigger failed with status', res.status)
      } else {
        const data = await res.json()
        console.log('Cron: completed', data)
      }
    } catch (err) {
      console.error('Cron: trigger error:', err)
    }
  })

  console.log('Cron: scheduled (daily at 00:00 UTC / 09:00 KST)')
}
