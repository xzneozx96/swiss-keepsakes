import { Link } from '@tanstack/react-router'

import { ChevronRightIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

/**
 * Heading of one home part (owner, 17.10.2026): a short label in the step's colour (the
 * same colour as its journey step), a serif title, a line, and an optional "See all ›".
 */
export function PartHeading({
  id,
  eyebrow,
  color,
  title,
  subtitle,
  seeAll,
}: {
  id: string
  eyebrow: string
  color: string
  title: string
  subtitle: string
  seeAll?: { label: string, to: '/$lang/tours' }
}) {
  const { language } = useLocale()

  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[13px] font-semibold" style={{ color }}>
          {eyebrow}
        </p>
        <h2
          className="font-serif text-[24px] leading-[30px] font-medium text-balance"
          id={id}
        >
          {title}
        </h2>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      {seeAll && (
        <Link
          className="flex shrink-0 items-center gap-0.5 rounded-md py-1 text-sm font-medium text-muted outline-none select-none focus-visible:focus-ring active:opacity-60"
          params={{ lang: language }}
          to={seeAll.to}
        >
          {seeAll.label}
          <ChevronRightIcon size={16} />
        </Link>
      )}
    </div>
  )
}
