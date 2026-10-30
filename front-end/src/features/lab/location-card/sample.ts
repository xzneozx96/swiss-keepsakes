import { useState } from 'react'

export interface Position { lat: number, lng: number }

/** The sample state of every card: a pin on the Chapel Bridge. */
export const CHAPEL_BRIDGE: Position = { lat: 47.05168, lng: 8.3074 }

/** What the server would answer to a short link: the Chapel Bridge. */
export const CANNED_ANSWER: Position = CHAPEL_BRIDGE

/** The place's own pin: a position, or none after “Remove the position”. */
export function useSamplePosition() {
  const [position, setPosition] = useState<Position | null>(CHAPEL_BRIDGE)

  return { position, place: setPosition, remove: () => setPosition(null) }
}

/** Stands in for the address of the form: the street name is known only near the sample. */
export function knownPlaceName(position: Position | null, name: string): string | null {
  if (!position)
    return null

  return Math.abs(position.lat - CHAPEL_BRIDGE.lat) < 0.0004 && Math.abs(position.lng - CHAPEL_BRIDGE.lng) < 0.0004 ? name : null
}
