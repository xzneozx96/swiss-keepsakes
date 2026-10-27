import { buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { ArrowRightIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'

interface AdviceBannerProps {
  title: string
  body: string
  action: string
  /** Three captions for the snapshots: lake, Pilatus, old town. */
  captions: [string, string, string]
}

const shots = [
  { photo: 'lake-steamboat', tilt: '-rotate-6', z: 'z-0', x: 'start-[2%]' },
  { photo: 'pilatus', tilt: 'rotate-3', z: 'z-10', x: 'start-[29%]' },
  { photo: 'lucerne-old-town', tilt: '-rotate-2', z: 'z-20', x: 'start-[56%]' },
]

/**
 * Trip-advice call to action (spec §4.1, §4.10), layout J "Polaroid stack" (owner choice
 * 13.10.2026): three tilted snapshots with captions, centred text and the screen's one
 * red primary action. Opens the trip assistant chat (C21, R19). No promised reply time,
 * no personal name: Swiss Keepsakes answers by email.
 */
export function AdviceBanner({
  title,
  body,
  action,
  captions,
}: AdviceBannerProps) {
  const { language } = useLocale()
  return (
    <section className="flex flex-col items-center gap-5 rounded-3xl bg-hero-cream px-5 pt-6 pb-6 text-center">
      <div aria-hidden className="relative h-40 w-full">
        {shots.map((s, i) => (
          <figure
            key={s.photo}
            className={`absolute top-0 ${s.x} ${s.tilt} ${s.z} flex w-[42%] flex-col gap-1 bg-white p-1.5 pb-2 shadow-overlay`}
          >
            <Media alt="" className="aspect-square" photo={s.photo} />
            <figcaption className="font-serif text-xs italic">
              {captions[i]}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex max-w-[30ch] flex-col gap-1.5">
        <h2 className="font-serif text-title text-balance">{title}</h2>
        <p className="text-sm text-foreground/75">{body}</p>
      </div>
      <Link
        className={`${buttonVariants({ variant: 'primary' })} transition-transform active:scale-[0.98]`}
        to="/$lang/plan"
        params={{ lang: language }}
      >
        {action}
        <ArrowRightIcon size={18} />
      </Link>
    </section>
  )
}
