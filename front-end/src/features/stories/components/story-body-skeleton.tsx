import { Skeleton } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'

/** The Story card while its editor loads: a toolbar row of 11 small blocks and four lines of text, in the card's shape. */
export function StoryBodySkeleton() {
  const { t } = useLocale()

  return (
    <div aria-busy="true" aria-label={t('storyEditor.body.loading')} className="flex flex-col gap-4" role="status">
      <div className="flex items-center gap-1 overflow-hidden rounded-xl border border-separator p-1">
        {Array.from({ length: 11 }, (_, index) => <Skeleton key={index} className="size-9 shrink-0 rounded-xl" />)}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-full rounded-full" />
        <Skeleton className="h-5 w-11/12 rounded-full" />
        <Skeleton className="h-5 w-full rounded-full" />
        <Skeleton className="h-5 w-2/3 rounded-full" />
      </div>
    </div>
  )
}
