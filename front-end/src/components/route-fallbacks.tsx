import { Button, Skeleton } from '@heroui/react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

/**
 * Any screen while its first read is on its way, so a query that suspends never blanks the app.
 * Demo reads never suspend; this is for the API. A skeleton, never a full-page spinner (spec §5.5).
 */
export function RoutePending() {
  return (
    <div aria-busy className="flex flex-col gap-6 px-4 pt-16" data-skeleton="route">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
      </div>
      <ul className="flex flex-col divide-y divide-separator rounded-3xl bg-surface px-4 shadow-surface">
        {[0, 1, 2, 3].map(index => (
          <li key={index} className="flex items-center gap-3 py-4">
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-3 w-1/2 rounded-lg" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Any screen whose read failed: says so and offers to try again. Retry clears the failed queries
 * and renders the screen again, so its queries read once more.
 */
export function RouteError() {
  const { t } = useLocale()
  const router = useRouter()
  const queryErrors = useQueryErrorResetBoundary()

  useEffect(() => {
    queryErrors.reset()
  }, [queryErrors])

  return (
    <div
      className="flex flex-col items-center gap-3 px-4 py-12 text-center"
      role="alert"
    >
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-2xl bg-surface-secondary text-muted"
      >
        <InfoIcon size={28} />
      </span>
      <p className="max-w-xs text-sm text-muted">{t('routeError.message')}</p>
      <Button
        size="sm"
        variant="secondary"
        onPress={() => void router.invalidate()}
      >
        {t('routeError.retry')}
      </Button>
    </div>
  )
}
