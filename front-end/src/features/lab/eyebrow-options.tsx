import type { IconComponent } from '@/components/icons'

import { GiftIcon, StoryIcon, TourIcon } from '@/components/icons'
import { Media } from '@/components/media'

export interface Part {
  number: number
  label: string
  title: string
  subtitle: string
  photo: string
  color: string
  icon: IconComponent
  /** "Step 1 of 3" in the guest's language. */
  step: string
}

export const partIcons = [StoryIcon, TourIcon, GiftIcon]

const title = 'font-serif text-[24px] leading-[30px] font-medium text-balance'
const sub = 'text-sm text-muted'

/** E0 · Current: "01 READ IT", a red serif numeral and spaced capitals. */
export function EyebrowCurrent({ part }: { part: Part }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-accent-soft-foreground uppercase">
        <span className="font-serif text-[15px] tracking-normal text-accent">
          {String(part.number).padStart(2, '0')}
        </span>
        {part.label}
      </p>
      <h2 className={title}>{part.title}</h2>
      <p className={sub}>{part.subtitle}</p>
    </div>
  )
}

/** E1 · Soft pill: a rounded tag in the step's colour, sentence case, like a chip. */
export function EyebrowPill({ part }: { part: Part }) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[13px] font-semibold"
        style={{
          backgroundColor: `color-mix(in oklab, ${part.color} 12%, white)`,
          color: part.color,
        }}
      >
        <span
          className="flex size-5 items-center justify-center rounded-full font-serif text-[12px] text-white"
          style={{ backgroundColor: part.color }}
        >
          {part.number}
        </span>
        {part.label}
      </span>
      <div className="flex flex-col gap-1">
        <h2 className={title}>{part.title}</h2>
        <p className={sub}>{part.subtitle}</p>
      </div>
    </div>
  )
}

/** E2 · Big numeral: a large light serif number beside the title, no label at all. */
export function EyebrowNumeral({ part }: { part: Part }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="font-serif text-[56px] leading-[52px] font-light"
        style={{ color: `color-mix(in oklab, ${part.color} 55%, white)` }}
      >
        {part.number}
      </span>
      <div className="flex min-w-0 flex-col gap-1 pt-1">
        <h2 className={title}>{part.title}</h2>
        <p className={sub}>{part.subtitle}</p>
      </div>
    </div>
  )
}

/** E3 · Icon badge: a round coloured icon for stories, tours or gifts, and the label beside it. */
export function EyebrowIcon({ part }: { part: Part }) {
  const Icon = part.icon

  return (
    <div className="flex flex-col gap-2.5">
      <p
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: part.color }}
      >
        <span
          className="flex size-8 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: part.color }}
        >
          <Icon size={18} />
        </span>
        {part.label}
      </p>
      <div className="flex flex-col gap-1">
        <h2 className={title}>{part.title}</h2>
        <p className={sub}>{part.subtitle}</p>
      </div>
    </div>
  )
}

/** E4 · Trail stop: the round photo and number from "How I'll show you Luzerne", so each part picks up its step. */
export function EyebrowTrail({ part }: { part: Part }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="relative shrink-0">
        <Media
          alt=""
          className="size-14 rounded-full shadow-[0_6px_14px_-6px_rgba(51,49,46,0.5)] ring-[3px] ring-surface"
          photo={part.photo}
        />
        <span
          className="absolute -top-1 -left-1 flex size-6 items-center justify-center rounded-full font-serif text-[12px] font-medium text-white ring-2 ring-background"
          style={{ backgroundColor: part.color }}
        >
          {part.number}
        </span>
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[12px] font-semibold" style={{ color: part.color }}>
          {part.label}
        </p>
        <h2 className={title}>{part.title}</h2>
      </div>
    </div>
  )
}

/** E5 · Divider: a thin rule with the label in the middle, like a chapter break in a book. */
export function EyebrowDivider({ part }: { part: Part }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="flex w-full items-center gap-3 font-serif text-[15px] text-muted italic">
        <span aria-hidden className="h-px flex-1 bg-separator" />
        {part.label}
        <span aria-hidden className="h-px flex-1 bg-separator" />
      </p>
      <h2 className={title}>{part.title}</h2>
      <p className={sub}>{part.subtitle}</p>
    </div>
  )
}

/** E6 · No eyebrow: only the title; the step sits quietly under it as "Step 1 of 3". */
export function EyebrowNone({ part }: { part: Part }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className={title}>{part.title}</h2>
      <p className={sub}>
        <span className="font-medium" style={{ color: part.color }}>
          {part.step}
        </span>
        {' · '}
        {part.subtitle}
      </p>
    </div>
  )
}
