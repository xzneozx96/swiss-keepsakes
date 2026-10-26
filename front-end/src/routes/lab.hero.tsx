import type { HeroOptionProps } from '@/features/lab/hero-options'

import { dateTimeFormat } from '@sk/domain/shared'

import { createFileRoute, Link } from '@tanstack/react-router'
import { useLocale } from '@/contexts/locale-context'
import { useDemoNow } from '@/features/demo'
import { Hero } from '@/features/discovery/components/hero'
import {
  HeroCollage,
  HeroGallery,
  HeroPhotoCard,
  HeroPlanner,
  HeroSkyGlass,
} from '@/features/lab/hero-options'
import {
  HeroChips,
  HeroSearchCard,
  HeroSoftPhoto,
  HeroTwoWeight,
} from '@/features/lab/hero-options-v2'
import {
  HeroF1PhotoBand,
  HeroF2LakeBlue,
  HeroF3SkyFade,
  HeroF4PhotoTabs,
  HeroF5CardPhoto,
} from '@/features/lab/hero-options-v3'
import { noIndexHead } from '@/lib/no-index'

/** Lab: compare discovery-home hero layouts at phone width. Not part of the product. */
export const Route = createFileRoute('/lab/hero')({
  ssr: false,
  head: noIndexHead,
  component: HeroLab,
})

const round3 = [
  {
    id: 'F1',
    title: 'F1 · Photo band',
    note: 'The Chapel Bridge photo is the band; white greeting on a dark top fade, the search card overlaps the water.',
    Option: HeroF1PhotoBand,
  },
  {
    id: 'F2',
    title: 'F2 · Lake blue',
    note: 'Closest to your reference: a deep lake-blue band with the Chapel Bridge faint in it, white greeting.',
    Option: HeroF2LakeBlue,
  },
  {
    id: 'F3',
    title: 'F3 · Sky fade (chosen)',
    note: 'The sky band from F; the Luzerne skyline fades in under the greeting and the card sits on the water.',
    Option: HeroF3SkyFade,
  },
  {
    id: 'F4',
    title: 'F4 · Photo tabs',
    note: 'Plain sky band; Gifts / Tours / Stays become photo tiles, pickup date and place side by side.',
    Option: HeroF4PhotoTabs,
  },
  {
    id: 'F5',
    title: 'F5 · Photo in the card',
    note: 'Plain sky band; the card opens with a Luzerne photo and a place chip, then tabs, date and Search.',
    Option: HeroF5CardPhoto,
  },
]

const round2 = [
  {
    id: 'F',
    title: 'F · Greeting and search card',
    note: 'Reference 1: soft sky band with a greeting, a white card with tabs, pickup date and a Search button.',
    Option: HeroSearchCard,
  },
  {
    id: 'G',
    title: 'G · Explore Luzerne',
    note: 'Reference 2: place line, two-weight title, tab row. No photo in the hero; the rails below carry the pictures.',
    Option: HeroTwoWeight,
  },
  {
    id: 'H',
    title: 'H · Serif title, soft photo',
    note: 'Reference 3: two-tone serif title, the Luzerne photo fading in and out, a search pill on top.',
    Option: HeroSoftPhoto,
  },
  {
    id: 'I',
    title: 'I · Greeting, search, chips',
    note: 'Reference 4: greeting with place, bold title, search field, category chips with small photos (would replace the category rail).',
    Option: HeroChips,
  },
]

const options = [
  {
    id: 'A',
    title: 'A · Sky glass',
    note: 'Full-bleed photo; title, intro and Luzerne clock on a frosted panel at the bottom (the sky-glass direction from the moodboard review).',
    Option: HeroSkyGlass,
  },
  {
    id: 'B',
    title: 'B · Photo card (Klook, GetYourGuide)',
    note: 'Rounded photo card with the title on a dark fade, place chip on top, and a 3-step \'how it works\' strip below.',
    Option: HeroPhotoCard,
  },
  {
    id: 'C',
    title: 'C · Swipe gallery (Airbnb Experiences)',
    note: 'Title first, then four Luzerne places to swipe through; the place sells the trip.',
    Option: HeroGallery,
  },
  {
    id: 'D',
    title: 'D · Journal collage',
    note: 'Sky-to-cream ground, three-photo collage with labels and one red action. Closest to the storybook journal direction.',
    Option: HeroCollage,
  },
  {
    id: 'E',
    title: 'E · Trip planner (Booking.com)',
    note: 'Short photo; a white card asks how long you stay. \'A few hours\' would scroll to quick-pickup gifts, \'A few days\' to tours. Most task-first.',
    Option: HeroPlanner,
  },
]

function HeroLab() {
  const { t, language, intlLocale } = useLocale()
  const now = useDemoNow()

  const props: HeroOptionProps = {
    language,
    appName: t('app.name'),
    title: t('home.title'),
    intro: t('home.intro'),
    photoAlt: t('home.photoAlt'),
    searchLabel: t('search.open'),
    localTime: dateTimeFormat(intlLocale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich',
    }).format(now),
  }

  return (
    <div className="flex flex-1 justify-center bg-default/40 py-6">
      <div className="flex w-[375px] flex-col gap-10 bg-background py-6 shadow-overlay">
        <header className="flex flex-col gap-1 px-4">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-heading">Discovery hero options</h1>
          <p className="text-sm text-muted">
            The top of the discovery home at phone width (375px). Stay chips and
            buttons do nothing here.
          </p>
        </header>
        <h2 className="px-4 text-heading text-accent-soft-foreground">
          Round 3 · variants of F
        </h2>
        {round3.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 border-t border-separator px-4 pt-6">
              <h2 className="text-heading">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <Option language={language} photoAlt={props.photoAlt} />
          </section>
        ))}
        <section className="flex flex-col gap-3 border-t border-separator pt-6">
          <div className="flex flex-col gap-0.5 px-4">
            <h2 className="text-heading text-muted">Shipped</h2>
            <p className="text-label text-muted">
              F3 with one big search box instead of the tabbed card.
            </p>
          </div>
          <div className="px-4">
            <Hero
              appName={props.appName}
              hello={t('home.hello')}
              photoAlt={props.photoAlt}
              searchLabel={props.searchLabel}
              searchPrompt={t('home.searchPrompt')}
              title={t('home.heroTitle')}
            />
          </div>
        </section>
        <h2 className="border-t border-separator px-4 pt-6 text-heading text-muted">
          Round 2 · simple (F picked)
        </h2>
        {round2.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 border-t border-separator px-4 pt-6">
              <h2 className="text-heading">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <Option language={language} photoAlt={props.photoAlt} />
          </section>
        ))}
        <h2 className="border-t border-separator px-4 pt-6 text-heading text-muted">
          Round 1 (rejected, kept for reference)
        </h2>
        {options.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 border-t border-separator px-4 pt-6">
              <h2 className="text-heading">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <Option {...props} />
          </section>
        ))}
      </div>
    </div>
  )
}
