import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PaperSummary } from '@/types/paper'
import { formatDistanceToNow } from 'date-fns'

interface PaperCardProps {
  paper: PaperSummary
}

export function PaperCard({ paper }: PaperCardProps) {
  const authorsDisplay =
    paper.authors.length > 3
      ? `${paper.authors.slice(0, 3).join(', ')} +${paper.authors.length - 3} more`
      : paper.authors.join(', ')

  return (
    <Link href={`/paper/${paper.arxivId}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <Badge variant="outline" className="w-fit text-xs mb-2">
            {paper.primaryCategory}
          </Badge>
          <CardTitle className="text-sm font-semibold line-clamp-2 leading-snug">
            {paper.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-gray-500">{authorsDisplay}</p>
          <p className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(paper.published), { addSuffix: true })}
          </p>
          <p className="text-xs text-gray-600 line-clamp-3">{paper.abstract}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
