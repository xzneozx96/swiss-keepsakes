/**
 * Lab, home V9: what a map pin shows when its place has no photo: an icon for its kind
 * (`pinKind`), never the name's initial (owner, revision 9). Used by the food map's pins,
 * clusters and card thumbnails. The icons come straight from `reicon-react` (Glass, Coffee,
 * ForkKnife, Basket, Walk, Camera, Drop, Ticket, MapPoint); add them to `components/icons.ts`
 * when this ships.
 */
import type { PinKind } from '@/features/lab/home-v9-data'
import type { Pin } from '@/features/lab/map-guest-data'

import { Basket, Camera, Coffee, Drop, ForkKnife, Glass, MapPoint, Ticket, Walk } from 'reicon-react'

import { pinKind } from '@/features/lab/home-v9-data'

const icons: Record<PinKind, (size: number) => React.ReactNode> = {
  pub: size => <Glass size={size} />,
  cafe: size => <Coffee size={size} />,
  restaurant: size => <ForkKnife size={size} />,
  market: size => <Basket size={size} />,
  walk: size => <Walk size={size} />,
  photo: size => <Camera size={size} />,
  essential: size => <Drop size={size} />,
  event: size => <Ticket size={size} />,
  place: size => <MapPoint size={size} />,
}

/** The kind's icon in white on the Victorinox section's lake blue (map pins, clusters, card thumbnails). */
export function PinIconFace({ pin, size }: { pin: Pin, size: number }) {
  return (
    <span aria-hidden className="flex size-full items-center justify-center bg-[#173f52] text-white" data-v9-pin-icon>
      {icons[pinKind(pin)](size)}
    </span>
  )
}
