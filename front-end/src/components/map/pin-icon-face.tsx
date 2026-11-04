import type { CategoryIcon } from '@sk/api-contract'

import { categoryIconComponents } from '@/components/category-icons'
import { PickupIcon } from '@/components/icons'

/**
 * What a pin, a cluster and a card thumbnail show where there is no ready cover: the place's category icon, white on the
 * lake blue, or a plain pin icon when no category has one. Never the name's initial.
 */
export function PinIconFace({ icon, size }: { icon?: CategoryIcon | null, size: number }) {
  const Icon = icon ? categoryIconComponents[icon] : PickupIcon

  return (
    <span aria-hidden className="flex size-full items-center justify-center bg-[#173f52] text-white" data-pin-icon={icon ?? 'pin'}>
      <Icon size={size} />
    </span>
  )
}
