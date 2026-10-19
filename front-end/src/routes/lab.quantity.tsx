import type { QuantityOptionProps } from '@/features/lab/quantity-options'

import { createFileRoute, Link } from '@tanstack/react-router'

import {
  QuantityBoxed,
  QuantityChips,
  QuantityLarge,
  QuantityPill,
  QuantityRow,
  QuantitySelect,
} from '@/features/lab/quantity-options'

/** Lab: compare quantity pickers for the C03 add-to-cart sheet. Not part of the product. */
export const Route = createFileRoute('/lab/quantity')({
  component: QuantityLab,
})

const options = [
  {
    id: 'A',
    title: 'A · Boxed stepper (previous)',
    note: 'HeroUI NumberField as built: label above, − value + in a bordered field.',
    Option: QuantityBoxed,
  },
  {
    id: 'B',
    title: 'B · Guest row (Airbnb) · chosen',
    note: 'Label and \'up to 4\' on the left, round outlined − and + with the number between, on the right. Same as Airbnb\'s guests picker.',
    Option: QuantityRow,
  },
  {
    id: 'C',
    title: 'C · Soft pill (Klook)',
    note: 'One grey pill holding − n +, beside the label; no borders.',
    Option: QuantityPill,
  },
  {
    id: 'D',
    title: 'D · Quick chips (Booking.com)',
    note: 'Tap 1, 2, 3 or 4 directly. One tap, no counting; works because stock per gift is small.',
    Option: QuantityChips,
  },
  {
    id: 'E',
    title: 'E · Big centred stepper (Apple Store)',
    note: 'Large round buttons and a large number in the middle; most visible, takes the most room.',
    Option: QuantityLarge,
  },
  {
    id: 'F',
    title: 'F · Dropdown (Amazon)',
    note: '\'1 ▾\' opens a list. Most compact, but one extra tap and less native-feeling.',
    Option: QuantitySelect,
  },
]

function QuantityLab() {
  const props: QuantityOptionProps = {
    label: 'Quantity',
    max: 4,
    hint: 'Up to 4 available',
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
          <h1 className="text-heading">Quantity picker options</h1>
          <p className="text-sm text-muted">
            For the C03 add-to-cart sheet. Each option works: try the buttons,
            the keyboard (arrow keys) and the limit of 4.
          </p>
        </header>
        {options.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3 px-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-semibold">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <div className="rounded-3xl bg-surface p-5 shadow-surface">
              <Option {...props} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
