import type { StepProps } from '../components/step-props'

import { useEffect, useRef, useState } from 'react'

import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { useLatest } from '@/hooks/use-latest'

/** How long a drag of the pin must rest before the register is asked. */
export const ADDRESS_LOOKUP_DELAY_MS = 400

export type LookupProblem = 'none' | 'unavailable'

/**
 * Fills the Address field from the Swiss building register when the pin is set: from a link, a tap or a drag. It asks
 * only after the position changes (not for the position the step opened with), waits for a drag to rest, and drops an
 * answer for a position that is no longer the pin. It never overwrites what the merchant typed: it fills an empty
 * field, or one that still holds the address it filled itself, so a pin moved again updates it. A lookup that finds
 * nothing or fails changes nothing in the field, and `problem` says which for the pin as it is now (`none`: no building
 * within 50 m, 404; `unavailable`: the register could not be read, even after the API's retry), until a lookup
 * succeeds, the pin moves or `typed` is called. `filled` is true while the field holds the filled text, so the
 * screen can say where it came from; editing the text ends that. `looking` is true while a request is out. `fill` is the
 * person's own tap on "Fill from the pin": it asks at once and replaces the text. `retry` asks again the way the
 * automatic lookup does, so it never overwrites a typed address.
 */
export function useAddressFromPosition({ storeId, latitude, longitude, address, patch }: {
  storeId: string
  latitude: number | null
  longitude: number | null
  address: string
  patch: StepProps['patch']
}): { filled: boolean, looking: boolean, problem: LookupProblem | null, fill: () => Promise<boolean>, retry: () => void, typed: () => void } {
  const lookup = useCommand('places', 'addressAt', { meta: { silent: true } })
  const [filled, setFilled] = useState<string | null>(null)
  const filledRef = useRef<string | null>(null)
  const openedRef = useRef({ latitude, longitude })

  const [failure, setFailure] = useState<{ problem: LookupProblem, at: string } | null>(null)
  const here = `${latitude},${longitude}`

  // Asks the register for a position. `replace` is the person's own tap; otherwise only an empty or self-filled field takes the answer.
  async function find(position: { latitude: number, longitude: number }, replace: boolean, isStale: () => boolean) {
    const at = `${position.latitude},${position.longitude}`
    let found
    try {
      found = await lookup.mutateAsync({ storeId, ...position })
    }
    catch (error) {
      if (!isStale())
        setFailure({ problem: error instanceof ApiProblem && error.type === 'address-not-found' ? 'none' : 'unavailable', at })

      return false
    }
    if (isStale())
      return false
    const previous = filledRef.current

    filledRef.current = found.formatted
    setFilled(found.formatted)
    setFailure(null)
    patch(current => (replace || current.address === '' || current.address === previous ? { address: found.formatted } : {}))

    return true
  }
  const findRef = useLatest(find)

  const fill = async () => (latitude === null || longitude === null ? false : find({ latitude, longitude }, true, () => false))
  const retry = () => {
    if (latitude !== null && longitude !== null)
      void find({ latitude, longitude }, false, () => false)
  }

  useEffect(() => {
    if (latitude === null || longitude === null || (latitude === openedRef.current.latitude && longitude === openedRef.current.longitude))
      return
    let stale = false
    const timer = setTimeout(() => void findRef.current({ latitude, longitude }, false, () => stale), ADDRESS_LOOKUP_DELAY_MS)

    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [latitude, longitude, findRef])

  return { filled: filled !== null && address === filled, looking: lookup.isPending, problem: failure?.at === here ? failure.problem : null, fill, retry, typed: () => setFailure(null) }
}
