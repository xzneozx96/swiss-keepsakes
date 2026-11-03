import { Skeleton } from '@heroui/react'

import { BAR_PULL_UP } from '@/components/layout/notice-aware-bar'
import { useLocale } from '@/contexts/locale-context'

/** The shape of Write while the story loads: the header bar, then the cover and title card (icon tile and title, 16:9 cover, two fields). */
export function StoryEditorSkeleton() {
  const { t } = useLocale()

  return (
    <div aria-busy="true" aria-label={t('storyEditor.loading')} className="flex flex-col gap-4" role="status">
      <div className={`-mx-4 flex h-16 items-center gap-3 border-b border-separator px-4 lg:-mx-8 ${BAR_PULL_UP} lg:px-6`}>
        <Skeleton className="size-11 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
        <Skeleton className="h-11 w-24 rounded-full" />
      </div>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 border-y border-separator bg-surface p-4 max-lg:-mx-4 lg:rounded-3xl lg:border-none lg:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-5 w-36 rounded-full" />
        </div>
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  )
}
