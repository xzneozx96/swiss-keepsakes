import { Skeleton } from '@heroui/react'

import { SetupFrame } from './setup-frame'

/** Loading shapes for the store screens. Each copies the container classes of the real rows and cards it stands in for, so nothing jumps when the data arrives. */

const ROW_CARD = 'flex flex-col gap-2 rounded-3xl bg-surface p-4 shadow-surface'
const BUTTON = 'h-11 rounded-xl'

function Heading({ width = 'w-40' }: { width?: string }) {
  return <Skeleton aria-hidden className={`h-6 rounded-lg ${width}`} />
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

/** Open your store as it will look: the frame, the steps beside the page (a bar and "All steps" on a phone), and one step with its footer. */
export function OnboardingSkeleton({ title }: { title: string }) {
  return (
    <SetupFrame title={title}>
      <p aria-live="polite" className="sr-only" role="status">{title}</p>
      <div aria-hidden className="flex flex-1 flex-col" data-skeleton="onboarding">
        <div className="flex flex-col gap-2 border-b border-separator bg-surface px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="mx-auto flex w-full max-w-5xl flex-1 items-start gap-8 px-4 py-6 pb-28 lg:px-8 lg:py-10">
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface">
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Skeleton className="h-5 w-28 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-lg" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <ul className="flex flex-col gap-1">
                {[0, 1, 2, 3, 4].map(index => (
                  <li key={index} className="flex min-h-11 items-center gap-3 px-3 py-2">
                    <Skeleton className="size-5 shrink-0 rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-32 rounded-lg" />
                      <Skeleton className="h-3 w-20 rounded-lg" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col rounded-3xl bg-surface shadow-surface">
            <div className="flex min-h-80 flex-col gap-6 p-5 lg:p-8" data-skeleton="step">
              <div className="flex items-start gap-4">
                <Skeleton className="size-12 shrink-0 rounded-2xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-7 w-44 max-w-full rounded-lg" />
                    <Skeleton className="h-7 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-3/4 rounded-lg" />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-4 w-4/5 rounded-lg" />
                <Skeleton className={`${BUTTON} w-52`} />
              </div>
            </div>
            <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-separator bg-surface px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] lg:static lg:rounded-b-3xl lg:px-8 lg:pb-3">
              <Skeleton className={`${BUTTON} w-20`} />
              <Skeleton className={`${BUTTON} w-32`} />
            </div>
          </div>
        </div>
      </div>
    </SetupFrame>
  )
}

/** Phone loading state of A01, as `StoreCards` lays out a store: name and status chip, the ⋯ button, the invitation sentence, the setup bar and the created line. */
export function StoreCardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <ul aria-hidden className="flex flex-col gap-3 lg:hidden" data-skeleton="store-cards">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <article className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface">
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
              <div className="flex min-w-0 flex-col items-start gap-1.5">
                <Skeleton className="h-6 w-44 max-w-full rounded-lg" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <Skeleton className="size-9 shrink-0 rounded-xl" />
            </div>
            <div className="flex flex-col gap-3 border-t border-dashed border-separator px-4 py-3">
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <div className="flex w-full max-w-40 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Skeleton className="h-5 w-20 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-lg" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
              <Skeleton className="h-5 w-32 rounded-lg" />
            </div>
          </article>
        </li>
      ))}
    </ul>
  )
}
