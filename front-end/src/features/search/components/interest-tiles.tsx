import type { InterestCode } from './interest-codes'

import { useId } from 'react'

import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { INTEREST_TILES } from './interest-codes'

/** The empty field's interests as photo tiles in two columns; the fifth spans both, shorter. A tile lists everything with that interest. */
export function InterestTiles({ onPick }: { onPick: (interest: InterestCode) => void }) {
  const { t } = useLocale()
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 className="text-heading" id={headingId}>{t('searchScreen.interestsTitle')}</h2>
      <ul className="grid grid-cols-2 gap-3">
        {INTEREST_TILES.map(({ code, photo }, i) => {
          const wide = i === INTEREST_TILES.length - 1

          return (
            <li key={code} className={wide ? 'col-span-2' : undefined}>
              <button
                className={`relative flex w-full overflow-hidden rounded-2xl text-start outline-none focus-visible:focus-ring motion-safe:active:scale-[0.98] motion-safe:transition-transform ${wide ? 'h-28' : 'aspect-[4/3]'}`}
                data-photo={photo}
                type="button"
                onClick={() => onPick(code)}
              >
                <Media alt="" className="absolute! inset-0" photo={photo} />
                {/* Ramps to 60% black by 60% of the height, so the white label stays readable over every photo. */}
                <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0)_40%,rgb(0_0_0/0.6)_60%)]" />
                <span className="relative mt-auto p-3 font-serif text-base leading-5 font-medium text-balance text-white">{t(`searchScreen.interest.${code}`)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
