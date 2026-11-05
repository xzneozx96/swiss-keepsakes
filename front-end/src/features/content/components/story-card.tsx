import type { Language } from '@sk/domain/shared'

import { Chip } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'

interface StoryCardProps {
  /** Opens C20; both language versions share the slug. */
  slug: string
  /** The language of the story's address, when it is not the guest's (a story that has no version in the guest's language). */
  lang?: Language
  photo?: string
  title: string
  meta: string
  /** Shown on the C19 list only; the C01 rail keeps cards short. */
  excerpt?: string
  /** The story is in the other language than the page (ADR-002): its short code, and the language's name for screen readers. */
  tag?: { code: string, label: string }
  layout?: 'rail' | 'list' | 'row'
}

const LINK = {
  rail: 'flex-col w-72 shrink-0 snap-start gap-2',
  list: 'flex-col gap-2.5',
  // The home's compact row: a small square photo beside the text.
  row: 'flex-row items-center gap-3',
}
const PHOTO = { rail: 'rounded-3xl aspect-[16/10]', list: 'rounded-3xl aspect-[4/3]', row: 'size-24 shrink-0 rounded-2xl' }
const TEXT = { rail: 'gap-0.5 px-1', list: 'gap-1 px-1', row: 'min-w-0 flex-1 gap-0.5' }

/**
 * A story on the C01 rail or the C19 list (spec §4.11). The list layout follows the C02
 * gift card: a 4:3 photo, serif title, then the excerpt and read time. The row layout is the
 * home's stories section: a 96 px square photo with the same text beside it.
 */
export function StoryCard({
  slug,
  lang,
  photo,
  title,
  meta,
  excerpt,
  tag,
  layout = 'list',
}: StoryCardProps) {
  const { language } = useLocale()
  return (
    <Link
      className={`flex rounded-3xl outline-none focus-visible:focus-ring transition-transform active:scale-[0.98] ${LINK[layout]}`}
      params={{ lang: lang ?? language, slug }}
      to="/$lang/stories/$slug"
    >
      <Media
        alt=""
        className={PHOTO[layout]}
        photo={photo}
      />
      <div className={`flex flex-col ${TEXT[layout]}`}>
        <h3 className="font-serif text-card-title text-balance">{title}</h3>
        {excerpt && (
          <p className="line-clamp-2 text-sm text-foreground/75">{excerpt}</p>
        )}
        <p className="flex items-center gap-2 text-label text-muted">
          {tag && (
            <Chip aria-label={tag.label} size="sm" variant="secondary">
              <Chip.Label>{tag.code}</Chip.Label>
            </Chip>
          )}
          {meta}
        </p>
      </div>
    </Link>
  )
}
