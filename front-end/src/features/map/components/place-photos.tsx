import { Button } from '@heroui/react'
import { useRef, useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { reducedMotion } from '@/components/map/reduced-motion'
import { useLocale } from '@/contexts/locale-context'

/**
 * The photos of a place in the details sheet: one picture at a time, swiped with the finger (CSS scroll snap), with
 * "n / N" and two buttons for the mouse and the keyboard. Each picture carries the merchant's text for it; without one
 * the picture is plain (`alt=""`), since the title above already names the place.
 */
export function PlacePhotos({ photos, title }: { photos: { src: string, alt: string | null }[], title: string }) {
  const { t } = useLocale()
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const count = photos.length

  function go(delta: 1 | -1) {
    const track = trackRef.current

    track?.scrollTo({ left: (index + delta) * track.clientWidth, behavior: reducedMotion() ? 'instant' : 'smooth' })
  }

  return (
    <div
      aria-label={t('map.sheet.gallery', { title })}
      aria-roledescription="carousel"
      className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl bg-[#173f52]"
      role="region"
    >
      <div
        ref={trackRef}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={event => setIndex(Math.round(event.currentTarget.scrollLeft / Math.max(1, event.currentTarget.clientWidth)))}
      >
        {photos.map((photo, i) => (
          <img
            key={photo.src}
            alt={photo.alt ?? ''}
            className="size-full shrink-0 snap-center object-cover"
            data-photo={i + 1}
            decoding="async"
            loading={i === 0 ? 'eager' : 'lazy'}
            src={photo.src}
          />
        ))}
      </div>
      {count > 1 && (
        <>
          <span aria-hidden className="pill pointer-events-none absolute end-3 bottom-3 rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums">
            {index + 1}
            {' / '}
            {count}
          </span>
          <span className="sr-only" aria-live="polite">{t('map.sheet.photo', { number: index + 1, count })}</span>
          <Button isIconOnly aria-label={t('map.sheet.photoPrevious')} className="pill absolute start-2 top-1/2 size-11 -translate-y-1/2 rounded-full" isDisabled={index <= 0} variant="tertiary" onPress={() => go(-1)}>
            <ChevronLeftIcon size={18} />
          </Button>
          <Button isIconOnly aria-label={t('map.sheet.photoNext')} className="pill absolute end-2 top-1/2 size-11 -translate-y-1/2 rounded-full" isDisabled={index >= count - 1} variant="tertiary" onPress={() => go(1)}>
            <ChevronRightIcon size={18} />
          </Button>
        </>
      )}
    </div>
  )
}
