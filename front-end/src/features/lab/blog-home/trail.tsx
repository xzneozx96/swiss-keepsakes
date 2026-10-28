import { Link } from '@tanstack/react-router'

import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'

export interface TrailStop {
  key: string
  photo: string
  color: string
  eyebrow: React.ReactNode
  title: string
  meta?: string
  action: { slug: string } | { onClick: () => void }
}

/** Numbered round photos on a dotted path that zigzags down the page. */
export function TrailList({ stops }: { stops: TrailStop[] }) {
  const { language } = useLocale()
  return (
    <ol className="flex flex-col">
      {stops.map((stop, i) => {
        const left = i % 2 === 0
        const className = `flex w-full items-center gap-4 rounded-3xl outline-none focus-visible:focus-ring active:opacity-80 ${left ? 'text-left' : 'flex-row-reverse text-right'}`
        const body = (
          <>
            <span className="relative shrink-0">
              <Media
                alt=""
                className="size-28 rounded-full shadow-[0_8px_18px_-8px_rgba(51,49,46,0.5)] ring-4 ring-surface"
                photo={stop.photo}
              />
              <span
                className={`absolute -top-1 flex size-8 items-center justify-center rounded-full font-serif text-[15px] font-medium text-white ring-[3px] ring-background ${left ? '-left-1' : '-right-1'}`}
                style={{ backgroundColor: stop.color }}
              >
                {i + 1}
              </span>
            </span>
            <span
              className={`flex min-w-0 flex-1 flex-col gap-1 ${left ? 'items-start' : 'items-end'}`}
            >
              <span
                className="flex items-center gap-1 text-[12px] font-semibold"
                style={{ color: stop.color }}
              >
                {stop.eyebrow}
              </span>
              <span className="font-serif text-[18px] leading-6 font-medium text-balance">
                {stop.title}
              </span>
              {stop.meta && (
                <span className="text-label text-muted">{stop.meta}</span>
              )}
            </span>
          </>
        )

        return (
          <li key={stop.key} className="flex flex-col">
            {'slug' in stop.action
              ? (
                  <Link
                    className={className}
                    params={{ lang: language, slug: stop.action.slug }}
                    to="/$lang/stories/$slug"
                  >
                    {body}
                  </Link>
                )
              : (
                  <button
                    className={className}
                    type="button"
                    onClick={stop.action.onClick}
                  >
                    {body}
                  </button>
                )}
            {i < stops.length - 1 && (
              <svg
                aria-hidden
                className="h-10 w-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 40"
              >
                <path
                  d={
                    left
                      ? 'M15.6 0 C15.6 26 84.4 14 84.4 40'
                      : 'M84.4 0 C84.4 26 15.6 14 15.6 40'
                  }
                  fill="none"
                  stroke="var(--accent)"
                  strokeDasharray="2 5"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </li>
        )
      })}
    </ol>
  )
}
