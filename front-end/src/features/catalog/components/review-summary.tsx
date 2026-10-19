import { Laurel, Stars } from '@/components/rating'

export interface ReviewSummaryProps {
  average: number
  /** "4.5" in the locale's number format. */
  averageText: string
  averageLabel: string
  /** "2 reviews". */
  countLabel: string
  /** Laurel badge (Airbnb "Guest favorite") when earned. */
  favourite?: { title: string, body: string }
}

/**
 * The big review score between golden laurels (Airbnb screen 42), always. Below it the
 * "Guest favourite" badge and its line when earned, otherwise stars and the count.
 * Used at the top of the reviews section and of the reviews sheet.
 */
export function ReviewSummary({
  average,
  averageText,
  averageLabel,
  countLabel,
  favourite,
}: ReviewSummaryProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex items-center gap-3">
        <Laurel className="h-[88px] w-10" side="start" />
        <span className="text-[64px] leading-none font-semibold tracking-tight tabular-nums">
          {averageText}
        </span>
        <Laurel className="h-[88px] w-10" side="end" />
      </div>
      {favourite
        ? (
            <>
              <span className="text-[22px] leading-7 font-semibold">
                {favourite.title}
              </span>
              <span className="max-w-xs text-sm text-muted">{favourite.body}</span>
            </>
          )
        : (
            <>
              <Stars label={averageLabel} rating={average} size={14} />
              <span className="text-sm text-muted">{countLabel}</span>
            </>
          )}
    </div>
  )
}
