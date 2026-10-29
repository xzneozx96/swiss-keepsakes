import { Skeleton } from '@heroui/react'

/** Loading shapes for the store screens. Each copies the container classes of the real rows and cards it stands in for, so nothing jumps when the data arrives. */

const ROW_CARD = 'flex flex-col gap-2 rounded-3xl bg-surface p-4 shadow-surface'
const FORM_CARD = 'flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface'
const BUTTON = 'h-11 rounded-xl'

function Heading({ width = 'w-40' }: { width?: string }) {
  return <Skeleton aria-hidden className={`h-6 rounded-lg ${width}`} />
}

function Field() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <Skeleton className="h-4 w-24 rounded-lg" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  )
}

/** The two list sections of the members tab and the invitations heading, as `MemberRow` and `InvitationRow` lay them out. */
export function MembersSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <Skeleton className="h-4 w-3/4 rounded-lg" />
      <section className="flex flex-col gap-3">
        <Heading />
        <ul className="flex flex-col gap-3">
          {[0, 1].map(index => (
            <li key={index} className={ROW_CARD}>
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 w-48 max-w-full rounded-lg" />
                <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className={`${BUTTON} w-28 self-start`} />
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <Heading width="w-32" />
        <ul className="flex flex-col gap-3">
          <li className={ROW_CARD}>
            <Skeleton className="h-5 w-44 max-w-full rounded-lg" />
            <Skeleton className="h-4 w-3/5 rounded-lg" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className={`${BUTTON} w-24`} />
              <Skeleton className={`${BUTTON} w-24`} />
            </div>
          </li>
        </ul>
      </section>
    </div>
  )
}

/** The invitation card of `InvitationPreview`: role chip, store name, the from line and the action. */
export function InvitationCardSkeleton() {
  return (
    <section aria-hidden className="flex flex-col items-start gap-3 rounded-3xl bg-surface p-5 shadow-surface">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-7 w-48 max-w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4 rounded-lg" />
      <Skeleton className={`${BUTTON} w-full`} />
    </section>
  )
}

/** A02 as it will look: the checklist, the store information form and the open-for-sale button. */
export function OnboardingSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6" data-skeleton="onboarding">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <Heading width="w-44" />
          <Skeleton className="h-4 w-10 rounded-lg" />
        </div>
        <ul className="flex flex-col gap-2">
          {[0, 1, 2, 3].map(index => (
            <li key={index} className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-surface">
              <Skeleton className="h-4 w-40 rounded-lg" />
              <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <Heading width="w-48" />
        <div className={FORM_CARD}>
          <Field />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28 rounded-lg" />
            <Skeleton className="h-5 w-24 rounded-lg" />
            <Skeleton className="h-5 w-24 rounded-lg" />
          </div>
          <Skeleton className={`${BUTTON} w-32`} />
        </div>
      </section>
      <Skeleton className="h-12 w-full rounded-xl" data-skeleton="open-for-sale" />
    </div>
  )
}
