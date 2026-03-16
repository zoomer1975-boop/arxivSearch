import { Suspense } from 'react'
import { SearchBar } from '@/components/search/search-bar'
import { PaperGallery } from '@/components/search/paper-gallery'
import { Skeleton } from '@/components/ui/skeleton'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        }
      >
        <PaperGallery />
      </Suspense>
    </div>
  )
}
