/**
 * Lab: candidate layouts for the trip-advice call to action at the end of the discovery
 * home (spec §4.1, §4.10). Compared on #/lab/advice. Copy rules: no "AI", no promised
 * reply time; the shop replies by email.
 */
import { buttonVariants } from '@heroui/react'

import { ChevronRightIcon, MessageIcon } from '@/components/icons'
import { Media } from '@/components/media'

export interface AdviceOptionProps {
  title: string
  body: string
  action: string
  /** Short line used by the compact options. */
  short: string
  shopName: string
  ownerName: string
  /** First-person greeting for the "note from the shop" option. */
  greeting: string
}

/** A · Photo banner: full-width lake photo, white serif title, white button. */
export function AdvicePhotoBanner({ title, body, action }: AdviceOptionProps) {
  return (
    <Media alt="" className="h-64 rounded-3xl" photo="lake-steamboat">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/5"
      />
      <div className="absolute inset-x-5 bottom-5 flex flex-col gap-2 text-white">
        <h2 className="font-serif text-title">{title}</h2>
        <p className="text-sm text-white/85">{body}</p>
        <span className="mt-1 inline-flex h-10 items-center self-start rounded-full bg-white px-4 text-sm font-medium text-foreground">
          {action}
        </span>
      </div>
    </Media>
  )
}

/** B · Note from the shop: a personal letter from the owner, initials avatar, ink text. */
export function AdviceShopNote({
  greeting,
  body,
  action,
  ownerName,
  shopName,
}: AdviceOptionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-surface">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-full bg-hero-cream font-serif text-lg"
        >
          {ownerName.slice(0, 1)}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{ownerName}</span>
          <span className="text-label text-muted">{shopName}</span>
        </div>
      </div>
      <p className="font-serif text-card-title">
        “
        {greeting}
        ”
      </p>
      <p className="text-sm text-muted">{body}</p>
      <span
        className={`${buttonVariants({ variant: 'secondary' })} self-start`}
      >
        {action}
      </span>
    </section>
  )
}

/** C · Split card: photo on top, text and a full-width button below. */
export function AdviceSplitCard({ title, body, action }: AdviceOptionProps) {
  return (
    <section className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface">
      <Media alt="" className="aspect-[16/9]" photo="lucerne-night" />
      <div className="flex flex-col gap-2 p-5">
        <h2 className="font-serif text-card-title">{title}</h2>
        <p className="text-sm text-muted">{body}</p>
        <span
          className={`${buttonVariants({ variant: 'secondary', fullWidth: true })} mt-2`}
        >
          {action}
        </span>
      </div>
    </section>
  )
}

/** D · Soft card with picture: text left, round photo right (reference 1 style). */
export function AdviceSideImage({ title, short, action }: AdviceOptionProps) {
  return (
    <section className="flex items-center gap-4 rounded-3xl bg-hero-cream p-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="font-serif text-card-title">{title}</h2>
        <p className="text-sm text-foreground/75">{short}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
          {action}
          <ChevronRightIcon size={16} />
        </span>
      </div>
      <Media alt="" className="size-24 shrink-0 rounded-full" photo="pilatus" />
    </section>
  )
}

/** E · List row: one quiet tappable row, like an iOS settings cell. */
export function AdviceRow({ title, short }: AdviceOptionProps) {
  return (
    <section className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 shadow-surface">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default"
      >
        <MessageIcon size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="truncate text-label text-muted">{short}</span>
      </div>
      <ChevronRightIcon className="shrink-0 text-muted" size={20} />
    </section>
  )
}
