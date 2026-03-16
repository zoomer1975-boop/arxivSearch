import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CategorySelector } from '@/components/mypage/category-selector'
import { KeywordManager } from '@/components/mypage/keyword-manager'
import { AlertSettings } from '@/components/mypage/alert-settings'
import { WatchedPapersList } from '@/components/mypage/watched-papers-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function MyPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [categories, keywords, settings, watchedPapers] = await Promise.all([
    prisma.userCategory.findMany({ where: { userId: session.user.id } }),
    prisma.userKeyword.findMany({ where: { userId: session.user.id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { alertMethod: true, telegramChatId: true, alertTime: true },
    }),
    prisma.watchedPaper.findMany({
      where: { userId: session.user.id },
      orderBy: { notifiedAt: 'desc' },
      take: 50,
    }),
  ])

  async function saveCategories(cats: string[]) {
    'use server'
    const { auth: getAuth } = await import('@/lib/auth')
    const { prisma: db } = await import('@/lib/prisma')
    const s = await getAuth()
    if (!s) return
    await db.$transaction([
      db.userCategory.deleteMany({ where: { userId: s.user.id } }),
      db.userCategory.createMany({
        data: cats.map(cat => ({ userId: s.user.id, category: cat })),
      }),
    ])
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">My Page</h1>
      <Tabs defaultValue="interests">
        <TabsList className="mb-6">
          <TabsTrigger value="interests">Interests</TabsTrigger>
          <TabsTrigger value="alerts">Alert Settings</TabsTrigger>
          <TabsTrigger value="papers">Watched Papers</TabsTrigger>
        </TabsList>

        <TabsContent value="interests" className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-4">Categories</h2>
            <CategorySelector
              initialSelected={categories.map(c => c.category)}
              onSave={saveCategories}
            />
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-4">Keywords</h2>
            <KeywordManager initialKeywords={keywords.map(k => k.keyword)} />
          </section>
        </TabsContent>

        <TabsContent value="alerts">
          <AlertSettings
            initialSettings={{
              alertMethod: settings?.alertMethod ?? 'EMAIL',
              telegramChatId: settings?.telegramChatId ?? null,
              alertTime: settings?.alertTime ?? '09:00',
            }}
          />
        </TabsContent>

        <TabsContent value="papers">
          <WatchedPapersList
            papers={watchedPapers.map(p => ({
              ...p,
              matchedKeywords: JSON.parse(p.matchedKeywords) as string[],
              notifiedAt: p.notifiedAt.toISOString(),
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
