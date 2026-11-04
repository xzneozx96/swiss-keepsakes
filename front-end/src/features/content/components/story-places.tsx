import type { PublicStory } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { Link } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'

const TAG = 'inline-flex min-h-11 items-center rounded-full bg-surface-secondary px-4 text-sm font-medium'

/**
 * The places a story tags, as links to the map with the place's card open (AC90, `?place=<slug>`). A place with no public
 * address is a plain tag. Nothing to show draws nothing.
 */
export function StoryPlaces({ places, language }: { places: PublicStory['places'], language: Language }) {
  const { t, language: guestLanguage } = useLocale()

  if (places.length === 0)
    return null

  return (
    <section aria-labelledby="story-places" className="mt-10 flex flex-col gap-4 border-t border-separator pt-7" lang={language}>
      <h2 className="font-serif text-title" id="story-places">{t('article.places')}</h2>
      <ul className="flex flex-wrap gap-2">
        {places.map(place => (
          <li key={place.id}>
            {place.slug
              ? <Link className={`${TAG} outline-none focus-visible:focus-ring`} params={{ lang: guestLanguage }} search={{ place: place.slug }} to="/$lang/map">{place.name}</Link>
              : <span className={`${TAG} text-muted`}>{place.name}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
