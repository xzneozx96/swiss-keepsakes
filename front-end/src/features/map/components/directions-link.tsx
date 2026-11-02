import { buttonVariants } from '@heroui/react'

import { OpenInMapsIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { directionsUrl } from '@/features/map/lib/directions'

/**
 * "Open in Google Maps": a link that opens in a new tab, destination only (AC89). The site never reads where the guest is
 * and draws no route. `icon` is the round button of a card (`quiet`: ghost, on the address row); without it the full
 * button of the sheet's footer.
 */
export function DirectionsLink({ place, icon }: {
  place: { mapsLink: string | null, latitude: number, longitude: number }
  icon?: 'filled' | 'quiet'
}) {
  const { t } = useLocale()
  const href = directionsUrl(place)
  const label = t('map.directions')

  if (icon) {
    return (
      <a
        aria-label={label}
        className={buttonVariants({ isIconOnly: true, variant: icon === 'quiet' ? 'ghost' : 'primary', className: `size-11 min-w-11 ${icon === 'quiet' ? 'text-muted' : ''}` })}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        <OpenInMapsIcon size={20} />
      </a>
    )
  }

  return (
    <a className={buttonVariants({ fullWidth: true, size: 'lg', variant: 'primary', className: 'min-h-12' })} href={href} rel="noreferrer" target="_blank">
      <OpenInMapsIcon size={20} />
      {label}
    </a>
  )
}
