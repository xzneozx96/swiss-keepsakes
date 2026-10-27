import type { SellerOptionProps } from '@/features/lab/seller-options'

import { pickText } from '@sk/domain/shared'

import { createFileRoute, Link } from '@tanstack/react-router'
import { useLocale } from '@/contexts/locale-context'
import { usePickupPlaces } from '@/features/catalog/api/queries'
import { shop } from '@/features/catalog/seed'
import {
  SellerChips,
  SellerIconRow,
  SellerMenu,
  SellerSheetRow,
  SellerStrip,
} from '@/features/lab/seller-options'
import { noIndexHead } from '@/lib/no-index'

const WHITESPACE = /\s/g

/** Lab: compact seller blocks for the C03 gift detail. Not part of the product. */
export const Route = createFileRoute('/lab/seller')({
  ssr: false,
  head: noIndexHead,
  component: SellerLab,
})

const options = [
  {
    id: 'A',
    title: 'A · Row with round icons',
    note: 'One row: logo, name, address and hours; Call, Email and Directions as round icons on the right. Tapping the name visits the shop. About 56px tall.',
    Option: SellerIconRow,
  },
  {
    id: 'B',
    title: 'B · Host row with chevron (Airbnb)',
    note: 'Same as Airbnb\'s host row. Tapping opens a small sheet with Call, Email, Directions and Visit shop. Most compact; the actions are one tap away.',
    Option: SellerSheetRow,
  },
  {
    id: 'C',
    title: 'C · Row and small chips (Klook)',
    note: 'Name row, then four small pills in one line: Call, Email, Directions, Visit shop.',
    Option: SellerChips,
  },
  {
    id: 'D',
    title: 'D · Row with a Contact menu',
    note: 'One row with a small \'Contact\' button that opens a menu (call, email, directions). Tapping the name visits the shop.',
    Option: SellerMenu,
  },
  {
    id: 'E',
    title: 'E · Contact strip (iOS contact card)',
    note: 'Name row, then one joined bar with four small icon actions, like the iOS contact card.',
    Option: SellerStrip,
  },
]

function SellerLab() {
  const { t, language } = useLocale()
  const place = usePickupPlaces(places => places[0])

  const props: SellerOptionProps = {
    initial: shop.name.charAt(0),
    name: shop.name,
    title: t('detail.seller.title', { shop: shop.name }),
    address: place.address,
    hours: pickText(place.openingHours, language).text,
    contacts: [
      {
        kind: 'call',
        label: t('detail.seller.call'),
        href: `tel:${shop.phone.replace(WHITESPACE, '')}`,
      },
      {
        kind: 'email',
        label: t('detail.seller.email'),
        href: `mailto:${shop.email}`,
      },
      {
        kind: 'directions',
        label: t('detail.seller.directions'),
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`,
      },
    ],
    visitLabel: t('detail.seller.visit'),
    contactLabel: t('detail.seller.contact'),
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
          <h1 className="text-heading">Seller block options</h1>
          <p className="text-sm text-muted">
            Compact versions of the seller card on the gift detail (C03). Each
            sits between the stats row and the highlights; the dividers show how
            much room it takes.
          </p>
        </header>
        {options.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3 px-6">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-semibold">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <div className="border-y border-separator py-5">
              <Option {...props} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
