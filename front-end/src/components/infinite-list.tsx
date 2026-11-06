import type { ReactNode } from 'react'

import { Button } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'

/** The sentinel counts as near when it is within one screen of the viewport. */
const ROOT_MARGIN = '100% 0px'

export interface InfiniteListProps {
  /** The list itself, every page loaded so far. */
  children: ReactNode
  /** How many items are loaded. A rise is announced; a rise is the only thing that is. */
  count: number
  /** Whether the server has a next page (`nextCursor` is not null). */
  hasMore: boolean
  /** A page is being fetched. One fetch runs at a time. */
  isLoading: boolean
  /** The last page failed. The list waits for a press on "Try again" and never retries by itself. */
  isFailed: boolean
  onLoadMore: () => void
  /** What the live region says when `added` items arrived, such as "10 more stories". */
  announce: (added: number) => string
}

/**
 * The shared infinite list of the guest pages (ADR-033, section 8). An IntersectionObserver watches a sentinel under the
 * list and loads the next page when it nears the viewport. The sentinel is a real "Load more" button, so a keyboard or switch
 * user, a browser without IntersectionObserver and a sentinel that cannot scroll into view all reach the next page. A
 * polite live region announces new items and focus stays where it is. A failed page shows "Try again" in place of the
 * button. A complete list ends with no line under it (owner, 06.11.2026). Nothing may sit under the list as the only path to something.
 */
export function InfiniteList({ children, count, hasMore, isLoading, isFailed, onLoadMore, announce }: InfiniteListProps) {
  const { t } = useLocale()
  const sentinelRef = useRef<HTMLDivElement>(null)
  // The text for the live region, worked out while rendering from the change in `count`.
  const [seen, setSeen] = useState({ count, text: '' })

  if (count !== seen.count)
    setSeen({ count, text: count > seen.count ? announce(count - seen.count) : '' })

  const waiting = hasMore && !isLoading && !isFailed

  // A new observer reports the sentinel's state at once, so a page that is too short to push it out of view loads the next one.
  useEffect(() => {
    const element = sentinelRef.current
    if (!waiting || !element || typeof IntersectionObserver === 'undefined')
      return undefined

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting))
        onLoadMore()
    }, { rootMargin: ROOT_MARGIN })
    observer.observe(element)

    return () => observer.disconnect()
  }, [waiting, count, onLoadMore])

  return (
    <>
      {children}
      <p aria-live="polite" className="sr-only" role="status">{seen.text}</p>
      {hasMore && (
        <div ref={sentinelRef} className="flex flex-col items-center gap-2">
          {isFailed && <p className="text-label text-danger" role="alert">{t('infiniteList.error')}</p>}
          <Button className="max-lg:min-h-11" isPending={isLoading} size="sm" variant="secondary" onPress={onLoadMore}>
            {isFailed ? t('infiniteList.retry') : isLoading ? t('infiniteList.loading') : t('infiniteList.loadMore')}
          </Button>
        </div>
      )}
    </>
  )
}
