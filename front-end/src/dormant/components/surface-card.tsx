import type { ComponentProps } from 'react'

/**
 * The gift flow's white card, with C06/C07 OrderCard's surface: white, rounded-3xl, the
 * shared soft shadow, no border (1.13s), blocks divided by fine lines. Used by the tour
 * screens since round 2 (14.10.2026).
 */
export function SurfaceCard({
  className = '',
  ...props
}: ComponentProps<'section'>) {
  return (
    <section
      className={`flex flex-col divide-y divide-separator rounded-3xl bg-surface shadow-surface ${className}`}
      {...props}
    />
  )
}

/**
 * One block of a SurfaceCard, padded as OrderCard's blocks (C06, C07; tour C10, C11, C13).
 * C16 opts into gift C15's ticket grammar: `compact` pads 16px as the C15 cards, and `dashed`
 * makes the rule under this block a dashed tear line (the card draws each rule as the upper
 * block's bottom border).
 */
export function SurfaceCardBlock({
  className = '',
  compact = false,
  dashed = false,
  ...props
}: ComponentProps<'div'> & { compact?: boolean, dashed?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-3 ${compact ? 'p-4' : 'p-5'}${dashed ? ' border-dashed' : ''} ${className}`}
      {...props}
    />
  )
}

/** The card title in OrderCard's serif; `as` sets the heading level (h2 by default). */
export function SurfaceCardTitle({
  as: Heading = 'h2',
  className = '',
  ...props
}: ComponentProps<'h2'> & { as?: 'h2' | 'h3' }) {
  return (
    <Heading className={`font-serif text-card-title ${className}`} {...props} />
  )
}
