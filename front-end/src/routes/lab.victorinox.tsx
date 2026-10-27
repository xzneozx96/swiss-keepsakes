import type { VictorinoxOptionProps } from '@/features/lab/victorinox-options'

import { createFileRoute, Link } from '@tanstack/react-router'

import { useDiscoveryView } from '@/features/discovery/hooks/use-discovery-view'
import {
  VxCabinet,
  VxKeyframes,
  VxMarquee,
} from '@/features/lab/victorinox-options'
import {
  VxChapters,
  VxHeritage,
  VxWorkshop,
} from '@/features/lab/victorinox-options-2'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { noIndexHead } from '@/lib/no-index'

/** Lab: Victorinox partner section options for the guest home (C01) at phone width. */
export const Route = createFileRoute('/lab/victorinox')({
  ssr: false,
  head: noIndexHead,
  component: VictorinoxLab,
})

const options = [
  {
    id: 'V1',
    title: 'V1 · Red marquee',
    note: 'The page\'s one Swiss-red spread: oversized serif wordmark, a fan of five knives, then all twelve on white tiles.',
    Option: VxMarquee,
  },
  {
    id: 'V2',
    title: 'V2 · Collector\'s cabinet',
    note: 'A dark pegboard case with the twelve knives on two labelled shelves; tap one to bring it forward.',
    Option: VxCabinet,
  },
  {
    id: 'V3',
    title: 'V3 · Three chapters',
    note: 'Luzerne icons, Alpine passes and Finsterwald as three cards with their own colours; they stack as you scroll.',
    Option: VxChapters,
  },
  {
    id: 'V4',
    title: 'V4 · Heritage first',
    note: 'The brand story from 1884 as a short timeline with a pinned knife, then the designs on their scenery photos.',
    Option: VxHeritage,
  },
  {
    id: 'V5',
    title: 'V5 · Workshop',
    note: 'One big knife at a time, front beside an engraved steel back that shows what the guest types.',
    Option: VxWorkshop,
  },
]

function VictorinoxLab() {
  const { victorinox } = useDiscoveryView()
  const isLoading = useSimulatedLoading()
  const props: VictorinoxOptionProps = {
    items: victorinox.items,
    isLoading,
    seeAll: victorinox.seeAll,
    subtitle: victorinox.subtitle,
    intro: victorinox.intro,
    story: victorinox.story,
  }

  return (
    <div className="flex flex-1 justify-center bg-default/40 py-6">
      <VxKeyframes />
      <div className="flex w-[390px] flex-col gap-10 bg-background py-6 shadow-overlay">
        <header className="flex flex-col gap-1 px-4">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-heading">Victorinox section options</h1>
          <p className="text-sm text-muted">
            The partner section of the home screen (C01) at phone width (390px),
            between Tours and Keepsakes. Links and taps work.
          </p>
        </header>
        {options.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-4" id={id}>
            <div className="flex flex-col gap-0.5 border-t border-separator px-4 pt-6">
              <h2 className="text-heading">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <div className="px-4">
              <Option {...props} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
