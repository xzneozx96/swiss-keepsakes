import type { CategoryIcon } from '@sk/api-contract'
import type { ReactNode } from 'react'

import { Link } from '@tanstack/react-router'

import { MapThumb } from '@/components/map/map-thumb'
import { useLocale } from '@/contexts/locale-context'

const PRESS = 'outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.98]'

/** The white serif title on a poster. */
export const POSTER_TITLE = 'font-serif text-[23px] leading-7 font-medium text-balance'

/**
 * The home's photo poster, shared by the events "This week" cards and the food highlight: the photo fills the card (the
 * category icon on the lake blue when there is none), a soft dark gradient carries the white type at the foot. Wide, it
 * fills the width at 4:3; otherwise it is 288 px at 4:5, the size a carousel peeks with. It opens the map with the place
 * (`?place=<slug>`); a place without a slug opens the map as it is.
 */
export function PhotoPoster({ slug, icon, src, wide, children }: { slug: string | null, icon: CategoryIcon | null, src: string | undefined, wide: boolean, children: ReactNode }) {
  const { language } = useLocale()

  return (
    <Link
      className={`relative block overflow-hidden rounded-2xl text-start text-white shadow-surface ${wide ? 'w-full' : 'w-[288px]'} ${PRESS}`}
      params={{ lang: language }}
      search={slug ? { place: slug } : {}}
      to="/$lang/map"
    >
      <MapThumb className={`${wide ? 'aspect-[4/3]' : 'aspect-[4/5]'} w-full`} icon={icon} iconSize={56} src={src} />
      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_20%,rgb(0_0_0/0.55)_55%,rgb(0_0_0/0.85)_100%)]" />
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">{children}</span>
    </Link>
  )
}
