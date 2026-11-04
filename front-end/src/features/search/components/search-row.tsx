import type { SearchResult } from '@/features/search/lib/search'

import { Skeleton } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { ChevronRightIcon, PickupIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'

/** One result: photo, title, its kind. A place opens the map with its card (the icon says so); no price is read here (AC54). */
export function SearchRow({ result }: { result: SearchResult }) {
  const { t } = useLocale()

  return (
    <Link
      {...result.link}
      className="flex min-h-[72px] items-center gap-3 rounded-2xl py-2 outline-none focus-visible:focus-ring active:bg-default"
    >
      <Media alt="" className={`size-14 shrink-0 ${result.kind === 'keepsake' ? 'rounded-xl' : 'rounded-2xl'}`} photo={result.photoUrl ?? result.photoKey ?? undefined} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-serif text-[17px] leading-[22px] font-medium text-balance">{result.title}</span>
        <span className="text-label text-muted">{t(`searchScreen.kind.${result.kind}`)}</span>
      </span>
      {result.kind === 'place'
        ? <PickupIcon aria-label={t('searchScreen.opensMap')} className="shrink-0 text-muted" size={18} />
        : <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />}
    </Link>
  )
}

/** The list's loading state: rows with the real row's photo and two lines. */
export function SearchRowsSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy className="flex flex-col gap-1" role="status">
      <span className="sr-only">{label}</span>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex min-h-[72px] items-center gap-3 py-2">
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-4 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
