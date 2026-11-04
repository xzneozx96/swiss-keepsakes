import { Skeleton } from '@heroui/react'

import { EditorHeaderSkeleton } from '@/components/layout/editor-header'
import { useLocale } from '@/contexts/locale-context'

/** The shape of Write while the story loads: the header bar, then the cover and title card (icon tile and title, 16:9 cover, two fields). */
export function StoryEditorSkeleton() {
  const { t } = useLocale()

  return (
    <div aria-busy="true" aria-label={t('storyEditor.loading')} className="flex flex-col gap-4" role="status">
      <EditorHeaderSkeleton />
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
