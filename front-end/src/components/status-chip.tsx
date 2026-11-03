import type { IconComponent } from '@/components/icons'

import { Chip } from '@heroui/react'

import {
  StatusDangerIcon,
  StatusInfoIcon,
  StatusNeutralIcon,
  StatusSuccessIcon,
  StatusWarningIcon,
} from '@/components/icons'

export type StatusTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

const toneIcon: Record<StatusTone, IconComponent> = {
  info: StatusInfoIcon,
  success: StatusSuccessIcon,
  warning: StatusWarningIcon,
  danger: StatusDangerIcon,
  neutral: StatusNeutralIcon,
}

// HeroUI has no info colour; info uses our info-soft tokens (Chip card).
const infoClass = 'bg-info-soft text-info-soft-foreground'

/**
 * The one status label (Chip card): soft tint, size lg (28px), a 14px icon and words.
 * Used for order progress, payment and availability. Never colour alone.
 */
export function StatusChip({
  tone,
  children,
}: {
  tone: StatusTone
  children: React.ReactNode
}) {
  const Icon = toneIcon[tone]
  const color = tone === 'neutral' || tone === 'info' ? 'default' : tone

  return (
    <Chip
      className={tone === 'info' ? infoClass : undefined}
      color={color}
      size="lg"
      variant="soft"
    >
      <Icon className="shrink-0" size={14} />
      <Chip.Label className="whitespace-nowrap">{children}</Chip.Label>
    </Chip>
  )
}

/**
 * A plain label next to a status (a category, an interest): the size and shape of StatusChip, in
 * the neutral soft tint and without an icon, so every chip of a table row looks like one family.
 */
export function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <Chip color="default" size="lg" variant="soft">
      <Chip.Label className="whitespace-nowrap">{children}</Chip.Label>
    </Chip>
  )
}
