import type { Part } from '@/features/lab/eyebrow-options'

import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useLocale } from '@/contexts/locale-context'
import {
  EyebrowCurrent,
  EyebrowDivider,
  EyebrowIcon,
  EyebrowNone,
  EyebrowNumeral,
  EyebrowPill,
  EyebrowTrail,
  partIcons,
} from '@/features/lab/eyebrow-options'
import {
  EyebrowHandwritten,
  EyebrowPhotoBand,
  EyebrowPostmark,
  EyebrowRibbon,
  EyebrowStamp,
  EyebrowTape,
  EyebrowTrailPin,
} from '@/features/lab/eyebrow-options-2'
import { noIndexHead } from '@/lib/no-index'

/** Lab: styles for the eyebrow above each home part (01 READ IT …) at phone width. */
export const Route = createFileRoute('/lab/eyebrow')({
  ssr: false,
  head: noIndexHead,
  component: EyebrowLab,
})

const round2 = [
  {
    id: 'F1',
    title: 'F1 · Handwritten',
    note: 'The label in handwriting with a drawn underline, like the script on the client’s card. Warm and personal; the voice of the person showing you round.',
    Option: EyebrowHandwritten,
  },
  {
    id: 'F2',
    title: 'F2 · Washi tape',
    note: 'The label on a strip of coloured paper tape, as if stuck into a travel journal. Playful, crafty.',
    Option: EyebrowTape,
  },
  {
    id: 'F3',
    title: 'F3 · Postage stamp',
    note: 'A small perforated stamp with the part’s photo, number and label, next to the title. Ties straight into keepsakes and postcards.',
    Option: EyebrowStamp,
  },
  {
    id: 'F4',
    title: 'F4 · Postmark',
    note: 'A round ink postmark “LUZERN · LUCERNE” with the step number, stamped over the corner. Says Luzerne without a photo.',
    Option: EyebrowPostmark,
  },
  {
    id: 'F5',
    title: 'F5 · Trail pin',
    note: 'The dotted path from “How I’ll show you Luzerne” comes down to a map pin at each part, so the page reads as one walk.',
    Option: EyebrowTrailPin,
  },
  {
    id: 'F6',
    title: 'F6 · Photo band',
    note: 'A short panorama of the part’s place with a big number and the label in handwriting. The most visual; a picture opens each part.',
    Option: EyebrowPhotoBand,
  },
  {
    id: 'F7',
    title: 'F7 · Gift ribbon',
    note: 'The number and label on a small notched ribbon in the step’s colour, like a gift tag.',
    Option: EyebrowRibbon,
  },
]

const options = [
  {
    id: 'E1',
    title: 'E1 · Soft pill',
    note: 'A rounded tag in the step’s colour with its number. Friendly and app-like; reads as a label, not a shout.',
    Option: EyebrowPill,
  },
  {
    id: 'E2',
    title: 'E2 · Big numeral',
    note: 'No label: a large light serif number beside the title, like chapters in a magazine. The quietest and most editorial.',
    Option: EyebrowNumeral,
  },
  {
    id: 'E3',
    title: 'E3 · Icon badge',
    note: 'A round icon for stories, tours and gifts, the same icons as the tab bar. Says what the part is at a glance.',
    Option: EyebrowIcon,
  },
  {
    id: 'E4',
    title: 'E4 · Trail stop',
    note: 'Each part opens with its round photo and number from “How I’ll show you Luzerne”, so the page reads as one walk.',
    Option: EyebrowTrail,
  },
  {
    id: 'E5',
    title: 'E5 · Chapter divider',
    note: 'A thin rule with the label in italics in the middle, like a chapter break in a book. Centred.',
    Option: EyebrowDivider,
  },
  {
    id: 'E6',
    title: 'E6 · No eyebrow',
    note: 'Only the title. “Step 1 of 3” sits quietly in colour at the start of the line under it.',
    Option: EyebrowNone,
  },
  {
    id: 'E0',
    title: 'E0 · Current (for comparison)',
    note: '“01 READ IT”: red serif numeral and spaced capitals.',
    Option: EyebrowCurrent,
  },
]

const HANDWRITING
  = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&display=swap'

function EyebrowLab() {
  // The handwriting face is for these options only, so it loads here and not in index.html.
  useEffect(() => {
    if (document.querySelector(`link[href="${HANDWRITING}"]`))
      return
    const link = document.createElement('link')

    link.rel = 'stylesheet'
    link.href = HANDWRITING
    document.head.appendChild(link)
  }, [])
  const { t, language } = useLocale()
  const step = (n: number) =>
    language === 'de' ? `Schritt ${n} von 3` : `Step ${n} of 3`
  const parts: Part[] = [
    {
      number: 1,
      label: t('home.part.read'),
      title: t('home.stories.title'),
      subtitle: t('home.stories.subtitle'),
      photo: 'musegg-wall',
      color: 'var(--accent)',
      icon: partIcons[0]!,
      step: step(1),
    },
    {
      number: 2,
      label: t('home.part.walk'),
      title: t('home.tours.title'),
      subtitle: t('home.tours.subtitle'),
      photo: 'rigi-vitznau-train',
      color: 'var(--info)',
      icon: partIcons[1]!,
      step: step(2),
    },
    {
      number: 3,
      label: t('home.part.keep'),
      title: t('home.keep.title'),
      subtitle: t('home.keep.subtitle'),
      photo: 'victorinox-spartan',
      color: 'var(--chart-4)',
      icon: partIcons[2]!,
      step: step(3),
    },
  ]

  return (
    <div className="flex flex-1 justify-center bg-default/40 sm:py-6">
      <div className="flex w-full max-w-[390px] flex-col gap-10 bg-background py-6 sm:shadow-overlay">
        <header className="flex flex-col gap-1 px-4">
          <Link
            className="self-start text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-heading">Home part heading: eyebrow styles</h1>
          <p className="text-sm text-muted">
            The small label above each part title is called an eyebrow (also a
            kicker or overline). Each option shows all three parts of the home,
            on the page background.
          </p>
        </header>
        {[
          { label: 'Round 2', list: round2 },
          { label: 'Round 1 (rejected, kept for reference)', list: options },
        ].map(round => (
          <div key={round.label} className="flex flex-col gap-10">
            <h2 className="border-t border-separator px-4 pt-6 text-heading text-accent-soft-foreground">
              {round.label}
            </h2>
            {round.list.map(({ id, title, note, Option }) => (
              <section key={id} className="flex flex-col gap-6 px-4">
                <div className="flex flex-col gap-0.5 rounded-2xl bg-surface-secondary p-3">
                  <h3 className="text-heading">{title}</h3>
                  <p className="text-label text-muted">{note}</p>
                </div>
                <div className="flex flex-col gap-10">
                  {parts.map(part => (
                    <Option key={part.number} part={part} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
