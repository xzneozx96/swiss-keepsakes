import type { AdviceOptionProps } from '@/features/lab/advice-options'

import { createFileRoute, Link } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import { shop } from '@/features/catalog/seed'
import {
  AdvicePhotoBanner,
  AdviceRow,
  AdviceShopNote,
  AdviceSideImage,
  AdviceSplitCard,
} from '@/features/lab/advice-options'
import {
  AdviceFirstQuestion,
  AdvicePolaroids,
  AdvicePostcard,
  AdviceRouteSketch,
  AdviceTicket,
} from '@/features/lab/advice-options-v2'

const round2 = [
  {
    id: 'F',
    title: 'F · Postcard from the shop',
    note: 'A handwritten-style postcard with a Luzerne photo stamp and a postmark.',
    Option: AdvicePostcard,
  },
  {
    id: 'G',
    title: 'G · Travel ticket',
    note: 'A boat/train ticket LUZ → ? with blanks to fill and a tear-off stub.',
    Option: AdviceTicket,
  },
  {
    id: 'H',
    title: 'H · First question, right here',
    note: 'Question 1 of 7 inline; one tap answers it and opens the rest.',
    Option: AdviceFirstQuestion,
  },
  {
    id: 'I',
    title: 'I · Route sketch',
    note: 'Three photo pins joined by a dashed route, like a local\'s hand-drawn map.',
    Option: AdviceRouteSketch,
  },
  {
    id: 'J',
    title: 'J · Polaroid stack',
    note: 'Three tilted snapshots with handwritten captions.',
    Option: AdvicePolaroids,
  },
]

/** Lab: compare trip-advice call-to-action layouts at phone width. Not part of the product. */
export const Route = createFileRoute('/lab/advice')({ component: AdviceLab })

const options = [
  {
    id: 'A',
    title: 'A · Photo banner',
    note: 'Lake photo, white serif title and a white button.',
    Option: AdvicePhotoBanner,
  },
  {
    id: 'B',
    title: 'B · Note from the shop',
    note: 'A short personal note from the owner; warm, human, no AI feel.',
    Option: AdviceShopNote,
  },
  {
    id: 'C',
    title: 'C · Split card',
    note: 'Photo on top, text and a full-width button below.',
    Option: AdviceSplitCard,
  },
  {
    id: 'D',
    title: 'D · Soft card with picture',
    note: 'Text left, round photo right, like your first reference.',
    Option: AdviceSideImage,
  },
  {
    id: 'E',
    title: 'E · List row',
    note: 'One quiet tappable row; the least visual weight.',
    Option: AdviceRow,
  },
]

function AdviceLab() {
  const { t, language } = useLocale()

  const props: AdviceOptionProps = {
    title: t('home.advice.title'),
    body: t('home.advice.body'),
    action: t('home.advice.action'),
    short:
      language === 'de'
        ? 'Ein paar Fragen, Antwort per E-Mail'
        : 'A few questions, a reply by email',
    shopName: shop.name,
    ownerName: shop.ownerName,
    greeting:
      language === 'de'
        ? 'Erzählen Sie mir von Ihrer Reise, ich schlage Ihnen ein paar Dinge vor.'
        : 'Tell me about your trip and I will suggest a few things.',
  }

  return (
    <div className="flex flex-1 justify-center bg-default/40 py-6">
      <div className="flex w-[375px] flex-col gap-8 bg-background px-4 py-6 shadow-overlay">
        <header className="flex flex-col gap-1">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-heading">Trip-advice section options</h1>
          <p className="text-sm text-muted">
            The last block on the discovery home, at phone width (375px).
          </p>
        </header>
        <h2 className="text-heading text-accent-soft-foreground">Round 2</h2>
        {round2.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-heading">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <Option language={language} ownerName={shop.ownerName} />
          </section>
        ))}
        <h2 className="border-t border-separator pt-6 text-heading text-muted">
          Round 1 (generic, kept for reference)
        </h2>
        {options.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
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
