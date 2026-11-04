import { Skeleton } from '@heroui/react'

/**
 * The story page while it loads: the tall cover with the title and excerpt at its foot, the author and date lines, the contents
 * bar and the first section of the body, in the places the real page draws them.
 */
export function StorySkeleton() {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="story">
      <div className="relative h-[min(68dvh,540px)]">
        <Skeleton className="size-full" />
        <div className="absolute inset-x-6 bottom-12 flex flex-col gap-2">
          <Skeleton className="h-10 w-4/5 rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
        </div>
      </div>
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
        <div className="mt-6 flex flex-col">
          <nav className="-mx-6 border-b border-separator/70 bg-background" data-skeleton="contents">
            <div className="flex gap-2 overflow-hidden px-6 py-2.5">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-full" />)}
            </div>
            <div className="h-0.5 bg-separator/60" />
          </nav>
          <div className="flex flex-col gap-4 pt-9">
            <Skeleton className="h-8 w-1/2 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-5/6 rounded-lg" />
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
