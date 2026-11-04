import { Skeleton } from '@heroui/react'

/** One story row as the list draws it: the 4:3 photo, the title, two lines of excerpt and the meta line. */
function StoryRowSkeleton() {
  return (
    <li className="flex flex-col gap-2.5" data-skeleton="story">
      <Skeleton className="aspect-[4/3] rounded-3xl" />
      <div className="flex flex-col gap-1 px-1">
        <Skeleton className="h-5 w-4/5 rounded-lg" />
        <Skeleton className="h-3.5 w-full rounded-lg" />
        <Skeleton className="h-3.5 w-3/5 rounded-lg" />
        <Skeleton className="h-3 w-1/3 rounded-lg" />
      </div>
    </li>
  )
}

/** The category row: chips as the TagGroup draws them (rounded, 44 px high). The widths vary like category names. */
function ChipsSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden" data-skeleton="chips">
      {['w-14', 'w-24', 'w-20', 'w-28', 'w-20'].map((width, i) => (
        <Skeleton key={i} className={`h-11 shrink-0 rounded-xl ${width}`} data-skeleton="chip" />
      ))}
    </div>
  )
}

export function StoriesListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul aria-busy className="flex flex-col gap-7">
      {Array.from({ length: rows }, (_, i) => <StoryRowSkeleton key={i} />)}
    </ul>
  )
}

/** The whole screen while the list loads: the 260 px photo banner, the category chips and the story rows (the sort line is drawn only once the answers opener exists). */
export function StoriesSkeleton() {
  return (
    <div className="flex flex-1 flex-col" data-skeleton="stories">
      <Skeleton className="h-[260px]" />
      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-4">
        <ChipsSkeleton />
        <StoriesListSkeleton />
      </div>
    </div>
  )
}
