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
    to: '/lab/keepsake-variant-design' as const,
    title: 'Keepsake variants, v2: three calmer designs (options for the owner to pick)',
    note: 'After B1 to B3 were turned down as too dense: V1 a quiet grouped list that opens in place, V2 one variant at a time like a settings page, V3 a sentence (“Sell Medium Edelweiss for CHF 39”) over quiet tiles. Laptop and phone width, a sold combination, invalid SKU and price, a refused archive and a new keepsake (31.10.2026).',
  },
  {
    to: '/lab/keepsake-option-design' as const,
    title: 'Keepsake options, v2: three calmer designs (options for the owner to pick)',
    note: 'After A1 to A3 were turned down as too dense: O1 a summary row per option that opens one at a time, O2 a plain page you type on, O3 a list and detail. English only until German is asked for; laptop and phone width, errors, a refused delete and a new option on a keepsake with variants (30.10.2026).',
  },
  {
    to: '/lab/keepsake-options' as const,
    title: 'Keepsake editor: option management and variant creation (options for the owner to pick)',
    note: 'Three designs for managing an option and its values (type and drag, a table in a sheet, chips with a small editor) and three for creating a variant (a sheet with a live check, a grid of free cells, an open row under the table), each at laptop and phone width with a note on German text, keyboard use and trade-offs (30.10.2026).',
  },
  {
    to: '/lab/location-card' as const,
    title: 'Location card (place editor, step 1: Location on the map), approved',
    note: 'Option C chosen 30.10.2026, built into the place editor: a clean link field, a 12 px gap, then the map in its own frame with recenter and remove as a small control group. Kept here as the reference; options A and B were removed.',
  },
  {
    to: '/lab/opening-hours' as const,
    title: 'Opening hours editor (place editor, step When), approved',
    note: 'Option A chosen 30.10.2026, built into the place editor: compact week rows with a switch, the range, a second range and copy to other days. Kept here as the reference; the other three options were removed.',
  },
  {
    to: '/lab/home' as const,
    title: 'Home: a local friend’s briefing (C01, S2), approved',
    note: 'The approved home: sky hero and map, the practical bits, See these first, free routes, the food map, While you’re in town, Victorinox and the advice banner. Section order fixed; answers only order cards inside sections. English only. Search S2 “One list” (approved) below. Spec: docs/ux/home-design.md (28.10.2026).',
  },
  {
    to: '/lab/keepsake-editor' as const,
    title: 'Keepsake catalog: keepsake, variants and stock (M12, N13, N14, N15, S7), approved',
    note: 'Medusa-shaped linked screens: Keepsakes list, the keepsake page on the story editor’s flow (edit cards, then Review and publish), the four-step create flow, the variant page, Inventory with its item page. Options per product. Spec: docs/ux/keepsake-editor-design.md (29.10.2026).',
  },
  {
    to: '/lab/language-switch' as const,
    title: 'Language version switch (shared by the editors), approved',
    note: 'The app’s thin tabs with a status icon and one status line; arrows move focus, a click or Enter chooses. Used by the story editor and the keepsake editor (29.10.2026).',
  },
  {
    to: '/lab/story-editor' as const,
    title: 'Story editor (M17, S3), approved',
    note: 'Write: Cover and title, then Story with a pinned formatting bar and the bubble on selected text; autosave; the byline is the signed-in account. Review and publish: phone preview, the language switch with the checks and Publish, and Details as collapsible cards. Spec: docs/ux/story-editor-design.md (29.10.2026).',
  },
  {
    to: '/lab/media' as const,
    title: 'Media library (N18, S4), approved',
    note: 'Option B: a photo wall with Photos, Audio and PDFs tabs, search by name, a selection bar that retires unused files, and a detail sheet with Replace and Retire on the preview, where the file is used, name, description and info. Spec: docs/ux/media-design.md (29.10.2026).',
  },
  {
    to: '/lab/pins' as const,
    title: 'Pins: dashboard editor and guest map together (S4)',
    note: 'The merchant’s pins list and pin editor (N16, N17, three editor structures) beside the guest’s Map tab and pin card (N02, N03, three map structures), on one list of pins: edit a pin and watch it on the map (28.10.2026).',
  },
  {
    to: '/lab/onboarding-fullscreen' as const,
    title: 'Onboarding (N01) and deep-link nudge (N24)',
    note: 'F1 Guided, the chosen full-screen two-step flow for a guest’s first visit to the home, and N2, the card shown while reading a story reached by a link or a partner QR code. Visitor switcher for the rule matrix (28.10.2026). Spec: docs/ux/onboarding-design.md.',
  },
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
