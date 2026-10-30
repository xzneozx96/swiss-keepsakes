import { Button, buttonVariants, Skeleton, Spinner } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { InfoIcon, OpenInMapsIcon, PickupIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

export type MapStatus = 'map-loading' | 'pins-loading' | 'failed' | 'empty'

const FADE_MS = 300

/**
 * The map while its photo tiles are on the way: a soft shimmer over the map area, a muted pin and a
 * "Loading the map" pill. It stays until the map has drawn its first view (`loading` ends), then
 * fades out, so the guest never sees a grey box and tiles popping in. It waits out the fade before
 * it leaves the page; with reduced motion it leaves at once.
 */
function MapLoadingVeil({ loading }: { loading: boolean }) {
  const { t } = useLocale()
  const [mounted, setMounted] = useState(loading)

  if (loading && !mounted)
    setMounted(true)

  useEffect(() => {
    if (loading)
      return
    const leave = setTimeout(setMounted, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FADE_MS, false)

    return () => clearTimeout(leave)
  }, [loading])

  if (!mounted)
    return null

  return (
    <div
      aria-busy={loading}
      className={`absolute inset-0 z-[4] flex flex-col items-center justify-center gap-3 bg-surface-secondary transition-opacity duration-300 motion-reduce:transition-none ${loading ? '' : 'pointer-events-none opacity-0'}`}
      data-skeleton="map"
      role="status"
    >
      <Skeleton aria-hidden className="absolute inset-0 rounded-none motion-reduce:after:animate-none" />
      <OpenInMapsIcon aria-hidden className="relative text-muted" size={30} />
      <span className="relative flex min-h-11 items-center gap-2.5 rounded-full bg-surface py-1.5 ps-2 pe-4 text-sm font-medium shadow-overlay">
        <Spinner size="sm" />
        {t('map.loadingMap')}
      </span>
    </div>
  )
}

function MapNotice({ status, onRetry }: { status: MapStatus | undefined, onRetry: () => void }) {
  const { t, language } = useLocale()

  if (status === undefined || status === 'map-loading')
    return null
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

/**
 * The map's loading, empty and failed states over it. The map keeps its place underneath, so the
 * controls and the tab bar never jump when the state changes. While the map draws, the screen shows
 * the veil and the controls' skeleton (`MapControlsSkeleton`). Render it always, with `undefined`
 * when there is nothing to say: the veil needs to stay mounted for its fade.
 */
export function MapStatusLayer({ status, onRetry }: { status: MapStatus | undefined, onRetry: () => void }) {
  return (
    <>
      <MapLoadingVeil loading={status === 'map-loading'} />
      <MapNotice status={status} onRetry={onRetry} />
    </>
  )
}
