import { ScrollShadow } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { PickupIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { avatarUrl } from '@/lib/avatars'
import { photoUrl } from '@/lib/photos'

export interface MovingStory {
  slug: string
  photo: string
  title: string
  category: string
  place: string
  author: string
  /** e.g. "4 min read". */
  meta: string
}

/**
 * Home stories (Lab R4 "Moving photos", owner 17.10.2026): tall 2:3 cards whose photo
 * drifts slowly, so the rail feels alive without a timer. Still for reduced motion.
 */
export function MovingStoryRail({
  label,
  stories,
}: {
  label: string
  stories: MovingStory[]
}) {
  const { language } = useLocale()
  return (
    <ScrollShadow
      hideScrollBar
      aria-label={label}
      className="-mx-4"
      orientation="horizontal"
      role="region"
      size={0}
    >
      <ul className="flex snap-x snap-mandatory scroll-px-4 gap-3 px-4 pb-2">
        {stories.map((story, i) => (
          <li key={story.slug} className="w-[64%] shrink-0 snap-start">
            <Link
              className="block rounded-[28px] outline-none focus-visible:focus-ring transition-transform active:scale-[0.98]"
              params={{ lang: language, slug: story.slug }}
              to="/$lang/stories/$slug"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-[28px] bg-gradient-to-b from-hero-sky to-surface-tertiary">
                <img
                  alt=""
                  className="absolute inset-0 size-full animate-ken-burns object-cover"
                  decoding="async"
                  loading="lazy"
                  src={photoUrl(story.photo)}
                  // Each card starts at a different point, so they never move in step.
                  style={{ animationDelay: `${-i * 2.3}s` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />
                <div className="absolute inset-x-3 top-3 flex items-center gap-2 text-[12px] font-medium text-white">
                  <img
                    alt=""
                    className="size-8 rounded-full bg-accent-soft ring-2 ring-white"
                    decoding="async"
                    loading="lazy"
                    src={avatarUrl(story.author)}
                  />
                  {story.author}
                  <span className="text-white/75">· {story.meta}</span>
                </div>
                <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2">
                  <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/20 px-2.5 py-0.5 text-[12px] font-semibold text-white backdrop-blur-md">
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full bg-white"
                    />
                    {story.category}
                  </span>
                  <h3 className="font-serif text-[22px] leading-7 font-medium text-balance text-white">
                    {story.title}
                  </h3>
                  {story.place && (
                    <p className="flex items-center gap-1 text-[12px] font-medium text-white/80">
                      <PickupIcon size={14} />
                      {story.place}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </ScrollShadow>
  )
}
