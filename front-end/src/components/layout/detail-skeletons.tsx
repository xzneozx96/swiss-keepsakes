import { Skeleton } from '@heroui/react'

const card = 'flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-surface'

/** Back link, title with its sub-line, and the status chips of a detail screen. */
export function DetailHeaderSkeleton({ chips = 2 }: { chips?: number }) {
  return (
    <header aria-hidden className="flex flex-col gap-3">
      <Skeleton className="hidden h-4 w-20 rounded-lg lg:block" />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: chips }, (_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>
    </header>
  )
}

/** The row of key facts: an icon tile, a label, a value and a sub-line each. */
export function FactsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      aria-hidden
      className="grid gap-4 rounded-3xl bg-surface p-5 shadow-surface sm:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-1/3 rounded-lg" />
            <Skeleton className="h-5 w-2/3 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A section card: its heading, then rows of a thumbnail, two text lines and a value. */
export function SectionCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className={card}>
      <Skeleton className="h-5 w-32 rounded-lg" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-12 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5 rounded-lg" />
            <Skeleton className="h-3 w-2/5 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-14 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

/** A side card of label and value pairs, as the guest or payments card. */
export function FactCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className={card}>
      <Skeleton className="h-5 w-24 rounded-lg" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <Skeleton className="h-3.5 w-1/4 rounded-lg" />
          <Skeleton className="h-3.5 w-1/3 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

/** A form card: its heading, then labelled fields. */
export function FormCardSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div aria-hidden className={card}>
      <Skeleton className="h-5 w-40 rounded-lg" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-24 rounded-lg" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}

/**
 * A detail screen while it loads: header, key facts, then the main column of section cards
 * beside a side column on wide screens, the layout of the order and partner screens.
 */
export function DetailSkeleton({
  chips,
  facts,
  main = 2,
  side = 2,
}: {
  chips?: number
  /** Key facts in the row under the header; none leaves the row out. */
  facts?: number
  main?: number
  side?: number
}) {
  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <DetailHeaderSkeleton chips={chips} />
      {facts ? <FactsSkeleton count={facts} /> : null}
      <div
        className={`grid gap-5 lg:items-start lg:gap-6 ${side > 0 ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : ''}`}
      >
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          {Array.from({ length: main }, (_, i) => (
            <SectionCardSkeleton key={i} rows={i === 0 ? 3 : 2} />
          ))}
        </div>
        {side > 0 && (
          <div className="hidden flex-col gap-6 lg:flex">
            {Array.from({ length: side }, (_, i) => (
              <FactCardSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** An editor screen while it loads: header and a form card per step or section. */
export function EditorFormSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <DetailHeaderSkeleton chips={1} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          {Array.from({ length: cards }, (_, i) => (
            <FormCardSkeleton key={i} fields={i === 0 ? 3 : 2} />
          ))}
        </div>
        <div className="hidden lg:block">
          <FactCardSkeleton rows={4} />
        </div>
      </div>
    </div>
  )
}
