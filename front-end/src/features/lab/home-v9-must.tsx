/**
 * Lab, home V9: the must-visits, as postcards (owner's choice, revision 2). One tall photo at a
 * time with the name and the local tip on it, the next card peeking, and the story behind it as
 * a pill on the photo when one is published. The answers only order the cards.
 */
import type { Language } from '@/features/lab/home-data'
import type { HomeModel } from '@/features/lab/home-kit'
import type { MustVisit } from '@/features/lab/home-v9-data'

import { StoryIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { mustVisitsFor, placeHref, storyOf, v9Copy } from '@/features/lab/home-v9-data'
import { OnlyIn, SectionHead } from '@/features/lab/home-v9-parts'

function StoryPill({ place, home, language }: { place: MustVisit, home: HomeModel, language: Language }) {
  const story = storyOf(place, language)

  if (!story)
    return null

  return (
    <button
      className="flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-black/45 px-3 text-sm font-semibold text-white backdrop-blur-sm outline-none focus-visible:focus-ring active:opacity-80"
      type="button"
      onClick={() => home.open(`/${language}/stories/${place.story}`)}
    >
      <StoryIcon size={18} />
      {v9Copy[language].storyLink}
      {story.fallback && <OnlyIn lang={story.lang} language={language} />}
    </button>
  )
}

export function MustVisits({ home, language, aside }: { home: HomeModel, language: Language, aside?: React.ReactNode }) {
  const c = v9Copy[language]

  return (
    <section aria-labelledby={home.headingId('v9-must')} className="flex flex-col gap-3" data-v9-must>
      <SectionHead aside={aside} body={c.mustBody} home={home} id="v9-must" title={c.mustTitle} />
      <ul aria-label={c.mustTitle} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pt-1 pb-2 [scrollbar-width:none]">
        {mustVisitsFor(home.answers).map(place => (
          <li key={place.id} className="flex shrink-0 snap-start" data-settle={`must/${place.id}`}>
            <article className="relative w-[300px] overflow-hidden rounded-2xl shadow-surface">
              <button
                className="block w-full text-start outline-none focus-visible:focus-ring active:opacity-90"
                type="button"
                onClick={() => home.open(placeHref(place.slug, language))}
              >
                <Media alt="" className="aspect-[4/5] w-full" photo={place.photo}>
                  <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_38%,rgb(0_0_0/0.78)_100%)]" />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 text-white">
                    <span className="font-serif text-[23px] leading-7 font-medium text-balance">{place.title[language]}</span>
                    <span className="text-sm leading-5 text-white/90">{place.tip[language]}</span>
                  </span>
                </Media>
              </button>
              <div className="absolute start-3 top-3">
                <StoryPill home={home} language={language} place={place} />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
