import { Button, buttonVariants, Spinner } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { InfoIcon, PickupIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

export type MapStatus = 'map-loading' | 'pins-loading' | 'failed' | 'empty'

/**
 * Loading, empty and failed, over the map. The map keeps its place underneath, so the controls
 * and the tab bar never jump when the state changes. While the map shell loads the screen shows
 * the controls' skeleton (`MapControlsSkeleton`), not a block.
 */
export function MapStatusLayer({ status, onRetry }: { status: MapStatus, onRetry: () => void }) {
  const { t, language } = useLocale()

  if (status === 'map-loading') {
    return (
      <div aria-busy className="absolute inset-0 z-[4] bg-surface-secondary" role="status">
        <span className="sr-only">{t('map.loading')}</span>
      </div>
    )
  }
  if (status === 'pins-loading') {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-[70px] z-[6] flex justify-center" role="status">
        <span className="flex min-h-11 items-center gap-2.5 rounded-full bg-surface py-1.5 ps-2 pe-4 text-sm font-medium shadow-overlay">
          <Spinner size="sm" />
          {t('map.loading')}
        </span>
      </div>
    )
  }
  const failed = status === 'failed'

  return (
    <div className="pointer-events-none absolute inset-x-3 top-[70px] z-[6] flex justify-center">
      <div className="pointer-events-auto flex w-full flex-col items-center gap-2 rounded-3xl bg-surface p-5 text-center shadow-overlay" role={failed ? 'alert' : 'status'}>
        {failed ? <InfoIcon className="text-danger" size={26} /> : <PickupIcon className="text-muted" size={26} />}
        <p className="font-serif text-card-title text-balance">{t(failed ? 'map.failed.title' : 'map.empty.title')}</p>
        <p className="text-sm text-balance text-muted">{t(failed ? 'map.failed.body' : 'map.empty.body')}</p>
        {failed
          ? <Button className="mt-1 min-h-11" variant="primary" onPress={onRetry}>{t('map.failed.retry')}</Button>
          : (
              <Link className={`${buttonVariants({ variant: 'secondary' })} mt-1 min-h-11`} params={{ lang: language }} to="/$lang">
                {t('map.empty.action')}
              </Link>
            )}
      </div>
    </div>
  )
}
