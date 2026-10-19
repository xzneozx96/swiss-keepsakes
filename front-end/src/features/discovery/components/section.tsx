import type { LinkProps } from '@tanstack/react-router'

import { ScrollShadow } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { ChevronRightIcon } from '@/components/icons'

interface SectionProps {
  id: string
  title: string
  subtitle?: string
  seeAll?: {
    label: string
    to: LinkProps['to']
    /** Opens the keepsakes list filtered to one sub-category. */
    subcategory?: string
  }
  children: React.ReactNode
}

const seeAllClass
  = 'flex shrink-0 items-center gap-0.5 rounded-md py-1 text-sm font-medium text-muted outline-none select-none focus-visible:focus-ring active:opacity-60'

/** A titled discovery section with an optional app-style "See all ›" action. */
export function Section({
  id,
  title,
  subtitle,
  seeAll,
  children,
}: SectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-heading" id={id}>
            {title}
          </h2>
          {subtitle && <p className="text-label text-muted">{subtitle}</p>}
        </div>
        {seeAll
          && (seeAll.subcategory
            ? (
                <Link
                  className={seeAllClass}
                  search={{ subcategory: seeAll.subcategory }}
                  to="/gifts"
                >
                  {seeAll.label}
                  <ChevronRightIcon size={16} />
                </Link>
              )
            : (
                <Link className={seeAllClass} to={seeAll.to}>
                  {seeAll.label}
                  <ChevronRightIcon size={16} />
                </Link>
              ))}
      </div>
      {children}
    </section>
  )
}

/**
 * Horizontal card rail. On phones it runs to the screen edges (cancelling the 16px
 * gutter) so the next card peeks in; HeroUI ScrollShadow fades the edges.
 */
export function Rail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <ScrollShadow
      hideScrollBar
      aria-label={label}
      className="-mx-4"
      orientation="horizontal"
      role="region"
      size={24}
    >
      <ul className="flex snap-x snap-mandatory gap-3 px-4 pb-2">{children}</ul>
    </ScrollShadow>
  )
}
