import { createFileRoute, Link } from '@tanstack/react-router'
import { noIndexHead } from '@/lib/no-index'

/** Lab index: UI experiments kept outside the product screens. */
export const Route = createFileRoute('/lab/')({
  ssr: false,
  head: noIndexHead,
  component: LabIndex,
})

const experiments = [
  {
    to: '/lab/eyebrow' as const,
    title: 'Home part heading: eyebrow styles',
    note: 'Six styles for the label above Read it, Walk it and Keep it on the home (17.10.2026).',
  },
  {
    to: '/lab/blog-home' as const,
    title: 'Stories-first home: structures and Christmas effects',
    note: 'Round 2: the hero is kept and the home reads as a story (stories, then tours, Victorinox and keepsakes), with story-category circles and “Discover Luzerne” tiles. Snow and lights effects. Round 1 kept for reference (17.10.2026).',
  },
  {
    to: '/lab/victorinox' as const,
    title: 'Victorinox section options',
    note: 'Five layouts for the partner section on the home screen (16.10.2026).',
  },
  {
    to: '/lab/calendar' as const,
    title: 'Merchant calendar',
    note: 'Calendar-only direction: mobile-first day, week and month views, date navigation and event details on tap.',
  },
  {
    to: '/lab/map-loading' as const,
    title: 'Map loading indicator',
    note: 'Five ways to show that the tour map is loading the next stop (15.10.2026).',
  },
  {
    to: '/lab/map' as const,
    title: '3D map look',
    note: 'Three basemaps for the tour itinerary map: current, aerial photo with terrain, and current with terrain.',
  },
  {
    to: '/lab/private-tour' as const,
    title: 'Private-tour call to action',
    note: 'Five options for the block under the tour list, after the home Polaroid stack (15.10.2026).',
  },
  {
    to: '/lab/cards' as const,
    title: 'Gift card options',
    note: 'Five layouts for the shared gift card. D chosen on 13.10.2026.',
  },
  {
    to: '/lab/advice' as const,
    title: 'Trip-advice section options',
    note: 'Five layouts for the call to action at the end of the discovery home.',
  },
  {
    to: '/lab/hero' as const,
    title: 'Discovery hero options',
    note: 'Three rounds of hero layouts. F3 Sky fade chosen on 13.10.2026, with a search box instead of the card.',
  },
  {
    to: '/lab/quantity' as const,
    title: 'Quantity picker options',
    note: 'Six quantity pickers for the gift detail sheet (C03).',
  },
  {
    to: '/lab/seller' as const,
    title: 'Seller block options',
    note: 'Five compact seller blocks for the gift detail (C03).',
  },
  {
    to: '/lab/cart-line' as const,
    title: 'Cart item options',
    note: 'Five more compact gift lines for the cart (C04).',
  },
  {
    to: '/lab/order-cards' as const,
    title: 'Gift order card options',
    note: 'Five roomier order cards with the gift photo for the store\'s order list (M03).',
  },
  {
    to: '/lab/review' as const,
    title: 'Review order box options',
    note: 'Layouts for review and send (C06) with each whole order in its own white card. A5 chosen on 13.10.2026.',
  },
]

function LabIndex() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
      <h1 className="text-heading">Lab</h1>
      <p className="text-sm text-muted">
        UI experiments for the prototype. Not part of the product screens.
      </p>
      <ul className="flex flex-col gap-2">
        {experiments.map(e => (
          <li key={e.to}>
            <Link
              className="flex flex-col gap-0.5 rounded-2xl bg-surface p-4 shadow-surface outline-none focus-visible:focus-ring"
              to={e.to}
            >
              <span className="font-medium">{e.title}</span>
              <span className="text-label text-muted">{e.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
