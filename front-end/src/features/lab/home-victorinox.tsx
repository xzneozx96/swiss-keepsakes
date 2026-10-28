/**
 * Lab, home: the shop's Victorinox introduction (the shipped `VictorinoxShowcase`) with the price
 * line off, at the end of each home direction. Texts are the shop's own (`home.victorinox.*`).
 */
import type { Language } from '@/features/lab/home-data'

import { VictorinoxShowcase } from '@/features/discovery/components/victorinox-showcase'
import { keepsakes } from '@/features/lab/home-data'

const copy = {
  en: {
    eyebrow: 'Our partner',
    since: 'Since 1884',
    subtitle: 'Swiss Army Knives engraved with your name',
    intro: 'Karl Elsener opened his cutler’s workshop in Ibach in 1884, and Victorinox still makes its knives in Switzerland. Choose a Luzerne or Alpine design in three sizes, and the shop engraves a name and a date on the back.',
    seeAll: 'Show all 12 designs',
  },
  de: {
    eyebrow: 'Unser Partner',
    since: 'Seit 1884',
    subtitle: 'Schweizer Taschenmesser, mit Ihrem Namen graviert',
    intro: 'Karl Elsener eröffnete 1884 in Ibach seine Messerschmiede, und Victorinox stellt seine Messer noch immer in der Schweiz her. Wählen Sie ein Luzerner oder alpines Design in drei Grössen, und der Laden graviert Namen und Datum auf die Rückseite.',
    seeAll: 'Alle 12 Designs anzeigen',
  },
} as const

export function HomeVictorinox({ language }: { language: Language }) {
  const c = copy[language]

  return (
    <div className="overflow-hidden px-4">
      <VictorinoxShowcase
        hidePrice
        eyebrow={c.eyebrow}
        intro={c.intro}
        isLoading={false}
        items={keepsakes.map(k => ({ slug: k.slug, name: k.name[language], fromLabel: '', price: '', pickupLine: '' }))}
        seeAll={c.seeAll}
        since={c.since}
        subtitle={c.subtitle}
        title="Victorinox"
      />
    </div>
  )
}
