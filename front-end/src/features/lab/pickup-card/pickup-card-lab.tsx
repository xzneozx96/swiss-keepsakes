import type { PickupPlace } from '@sk/api-contract'

import { Link } from '@tanstack/react-router'

import { OptionA, OptionB, OptionC } from './options'
import { samples } from './samples'

const options: { id: string, title: string, idea: string, Card: (props: { place: PickupPlace }) => React.ReactNode }[] = [
  { id: 'A', title: 'Quiet row', idea: 'Name, address and hours in one tight block with a ⋯ menu; the densest, nothing to hit by mistake.', Card: OptionA },
  { id: 'B', title: 'Facts card', idea: 'Labelled rows (Address, Hours, Finding it) and Archive and Delete always visible at the foot.', Card: OptionB },
  { id: 'C', title: 'Map first', idea: 'A map thumbnail with the pin heads the card, then the facts and a ⋯ menu.', Card: OptionC },
]

function Column({ label, width, Card }: { label: string, width: string, Card: (props: { place: PickupPlace }) => React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-label text-muted">{label}</p>
      <ul className={`flex max-w-full flex-col gap-4 ${width}`}>
        {samples.map(place => (
          <li key={place.id}>
            <Card place={place} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PickupCardLab() {
  return (
    <div className="flex flex-1 flex-col gap-10 bg-default/40 px-4 py-8 xl:px-8">
      <header className="flex max-w-3xl flex-col gap-2">
        <Link className="text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Pickup point card, three options</h1>
        <p className="text-sm text-pretty text-muted">
          The owner did not like the card (icon tile, language chip row, dashed divider, wide Archive button). Each option shows the same three points: a complete one, one with no German, and an archived one. A language badge shows only for the missing language. Actions are Archive, Restore and Delete; opening the card is Edit. Buttons do nothing here. English only.
        </p>
      </header>
      {options.map(({ id, title, idea, Card }) => (
        <section key={id} aria-labelledby={`pickup-${id}`} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="flex items-center gap-2 text-heading" id={`pickup-${id}`}>
              <span aria-hidden className="grid size-6 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{id}</span>
              {title}
            </h2>
            <p className="text-sm text-pretty text-muted">{idea}</p>
          </div>
          <div className="flex flex-wrap items-start gap-8">
            <Column Card={Card} label="Desktop (one column of the two-column list)" width="w-136" />
            <Column Card={Card} label="Phone, 375 px" width="w-93.75" />
          </div>
        </section>
      ))}
    </div>
  )
}
