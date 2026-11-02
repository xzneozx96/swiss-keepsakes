import type { StepProps } from '../components/step-props'

import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { useCommand } from '@/features/data-client/use-command'

/** How long a drag of the pin must rest before the register is asked. */
export const ADDRESS_LOOKUP_DELAY_MS = 400

/**
 * Fills the Address field from the Swiss building register when the pin is set: from a link, a tap or a drag. It asks
 * only after the position changes (not for the position the step opened with), waits for a drag to rest, and drops an
 * answer for a position that is no longer the pin. It never overwrites what the merchant typed: it fills an empty
 * field, or one that still holds the address it filled itself, so a pin moved again updates it. A lookup that finds
 * nothing or fails changes nothing and shows nothing. Returns true while the field holds the filled text, so the
 * screen can say where it came from; editing the text ends that. `looking` is true while a request is out. `fill` is the
 * person's own tap on "Fill from the pin": it asks at once and replaces the text, and says whether it found an address.
 */
export function useAddressFromPosition({ storeId, latitude, longitude, address, patch }: {
  storeId: string
  latitude: number | null
  longitude: number | null
  address: string
  patch: StepProps['patch']
}): { filled: boolean, looking: boolean, fill: () => Promise<boolean> } {
  const lookup = useCommand('places', 'addressAt', { meta: { silent: true } })
  const [filled, setFilled] = useState<string | null>(null)
  const filledRef = useRef<string | null>(null)
  const openedRef = useRef({ latitude, longitude })

  const find = useEffectEvent(async (position: { latitude: number, longitude: number }, isStale: () => boolean) => {
    const found = await lookup.mutateAsync({ storeId, ...position }).catch(() => undefined)

    if (!found || isStale())
      return
    const previous = filledRef.current

    filledRef.current = found.formatted
    setFilled(found.formatted)
    patch(current => (current.address === '' || current.address === previous ? { address: found.formatted } : {}))
  })

  const fill = async () => {
    if (latitude === null || longitude === null)
      return false
    const found = await lookup.mutateAsync({ storeId, latitude, longitude }).catch(() => undefined)

    if (!found)
      return false
    filledRef.current = found.formatted
    setFilled(found.formatted)
    patch({ address: found.formatted })

    return true
  }

  useEffect(() => {
    if (latitude === null || longitude === null || (latitude === openedRef.current.latitude && longitude === openedRef.current.longitude))
      return
    let stale = false
    const timer = setTimeout(() => void find({ latitude, longitude }, () => stale), ADDRESS_LOOKUP_DELAY_MS)

    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [latitude, longitude])

  return { filled: filled !== null && address === filled, looking: lookup.isPending, fill }
}
