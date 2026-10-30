import type { ReactNode } from 'react'
import type { IconComponent } from '@/components/icons'

import { Button, Tooltip } from '@heroui/react'

/**
 * A stack of map controls over a map, in the shape of Google Maps' zoom and locate buttons: one white rounded group,
 * a button per action, thin lines between them. It sits over the map, so it takes the pointer for itself and leaves
 * the rest of the map to the map.
 */
export function MapControlGroup({ label, children }: { label: string, children: ReactNode }) {
  return (
    <div
      aria-label={label}
      className="pointer-events-auto flex flex-col divide-y divide-separator overflow-hidden rounded-2xl bg-overlay shadow-overlay"
      role="group"
    >
      {children}
    </div>
  )
}

/** One icon button of a `MapControlGroup`: a tooltip and an `aria-label` with the same words, and a danger tone on hover for what removes something. */
export function MapControlButton({ icon: Icon, label, tone, onPress }: {
  icon: IconComponent
  label: string
  tone?: 'danger'
  onPress: () => void
}) {
  return (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        aria-label={label}
        className={`rounded-none ${tone === 'danger' ? 'hover:bg-danger-soft hover:text-danger' : ''}`}
        size="lg"
        variant="ghost"
        onPress={onPress}
      >
        <Icon aria-hidden size={18} />
      </Button>
      <Tooltip.Content placement="left">
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  )
}
