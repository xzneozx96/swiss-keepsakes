import { Skeleton } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'

function CardSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-xl" />
        <Skeleton className="h-5 w-32 rounded-lg" />
      </div>
      {children}
    </div>
  )
}

/** The edit screen's shape: the top bar, then the four cards (name and text, photos, options, variants) and the commission. */
export function EditorSkeleton() {
  const { t } = useLocale()

  return (
    <div aria-busy="true" aria-label={t('keepsakes.loading')} className="flex flex-col">
      <div className="-mx-4 -mt-4 flex min-h-16 items-center gap-3 border-b border-separator px-2 py-2 lg:-mx-8 lg:-mt-8 lg:px-8">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-48 rounded-lg" />
          <Skeleton className="h-3 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-20 rounded-full lg:w-40" />
      </div>
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-3 pt-3 lg:gap-6 lg:pt-8">
        <CardSkeleton>
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </CardSkeleton>
        <CardSkeleton>
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <Skeleton className="h-4 w-40 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-28 rounded-full" />
        </CardSkeleton>
        <CardSkeleton>
          <Skeleton className="h-4 w-64 max-w-full rounded-lg" />
        </CardSkeleton>
        <CardSkeleton>
          <Skeleton className="h-9 w-64 max-w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </CardSkeleton>
        <CardSkeleton>
          <Skeleton className="mx-auto h-12 w-40 rounded-full" />
        </CardSkeleton>
      </div>
    </div>
  )
}

/** The create flow's first step: the header with its step line, then the name and text card and the photos card. */
export function CreateSkeleton() {
  const { t } = useLocale()

  return (
    <div aria-busy="true" aria-label={t('keepsakes.loading')} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-3 w-32 rounded-lg" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4">
        <CardSkeleton>
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </CardSkeleton>
        <CardSkeleton>
          <Skeleton className="h-9 w-28 rounded-full" />
        </CardSkeleton>
      </div>
    </div>
  )
}
